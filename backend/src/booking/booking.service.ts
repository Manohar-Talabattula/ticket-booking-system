import { WaitlistService } from '../waitlist/waitlist.service';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private waitlistService: WaitlistService,
    @InjectQueue('seat-hold-expiry') private holdQueue: Queue,
  ) {}

  async confirmBooking(showSeatId: string, userId: string) {
    const hold = await this.prisma.seatHold.findUnique({ where: { showSeatId } });
    if (!hold || hold.userId !== userId) {
      throw new BadRequestException('No active hold found for this user on this seat');
    }

    const showSeat = await this.prisma.showSeat.findUnique({
      where: { id: showSeatId },
      include: { show: true, seat: true },
    });
    if (!showSeat) {
      throw new NotFoundException('Seat not found');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const bookingRef = randomBytes(6).toString('hex').toUpperCase();

    const booking = await this.prisma.$transaction(async (tx) => {
      await tx.seatHold.delete({ where: { showSeatId } });

      await tx.showSeat.update({
        where: { id: showSeatId },
        data: { status: 'BOOKED' },
      });

      return tx.booking.create({
        data: {
          bookingRef,
          userId,
          showId: showSeat.showId,
          showSeatId,
        },
      });
    });

    // Cancel the scheduled auto-release job — booking is now permanent
    const job = await this.holdQueue.getJob(hold.id);
    if (job) await job.remove();

    // Generate QR code encoding the booking reference
    const qrCodeBase64 = await QRCode.toDataURL(bookingRef);

    // Send confirmation email (don't block the response if email fails)
    this.emailService
      .sendBookingConfirmation(user.email, bookingRef, showSeat.show.title, qrCodeBase64)
      .catch((err) => console.error('Failed to send confirmation email:', err.message));

    return booking;
  }

  async getBookingHistory(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        show: { include: { venue: true } },
        showSeat: { include: { seat: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

    async cancelBooking(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { showSeat: { include: { seat: true } } },
    });
    if (!booking || booking.userId !== userId) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking already cancelled');
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    const category = booking.showSeat.seat.category;
    const offered = await this.waitlistService.offerSeatToNextInLine(
      booking.showId,
      category,
      booking.showSeatId,
    );

    if (!offered) {
      await this.prisma.showSeat.update({
        where: { id: booking.showSeatId },
        data: { status: 'AVAILABLE' },
      });
    }

    return { message: 'Booking cancelled' };
  }
}