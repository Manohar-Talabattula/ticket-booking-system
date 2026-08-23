import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const OFFER_TTL_MINUTES = 15;

@Injectable()
export class WaitlistService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    @InjectQueue('waitlist-offer-expiry') private offerQueue: Queue,
  ) {}

  async joinWaitlist(showId: string, category: 'PREMIUM' | 'STANDARD' | 'ECONOMY', userId: string) {
    const show = await this.prisma.show.findUnique({ where: { id: showId } });
    if (!show) {
      throw new NotFoundException('Show not found');
    }

    return this.prisma.waitlist.create({
      data: { showId, category, userId, status: 'WAITING' },
    });
  }

  async offerSeatToNextInLine(showId: string, category: string, showSeatId: string) {
    const nextInLine = await this.prisma.waitlist.findFirst({
      where: { showId, category: category as any, status: 'WAITING' },
      orderBy: { joinedAt: 'asc' },
    });

    if (!nextInLine) {
      return null;
    }

    const offerExpiresAt = new Date(Date.now() + OFFER_TTL_MINUTES * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.waitlist.update({
        where: { id: nextInLine.id },
        data: { status: 'OFFERED', offerExpiresAt },
      });

      await tx.showSeat.update({
        where: { id: showSeatId },
        data: { status: 'HELD' },
      });

      await tx.seatHold.create({
        data: { showSeatId, userId: nextInLine.userId, expiresAt: offerExpiresAt },
      });
    });

    await this.offerQueue.add(
      'expire-offer',
      { waitlistId: nextInLine.id, showId, category, showSeatId },
      { delay: OFFER_TTL_MINUTES * 60 * 1000, jobId: nextInLine.id },
    );

    const user = await this.prisma.user.findUnique({ where: { id: nextInLine.userId } });
    const show = await this.prisma.show.findUnique({ where: { id: showId } });

    if (user && show) {
      const offerLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/waitlist-offer/${showSeatId}`;
      this.emailService
        .sendWaitlistOffer(user.email, show.title, offerLink, OFFER_TTL_MINUTES)
        .catch((err) => console.error('Failed to send waitlist offer email:', err.message));
    }

    return nextInLine;
  }

  async expireOffer(waitlistId: string, showId: string, category: string, showSeatId: string) {
    const entry = await this.prisma.waitlist.findUnique({ where: { id: waitlistId } });
    if (!entry || entry.status !== 'OFFERED') {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.waitlist.update({ where: { id: waitlistId }, data: { status: 'EXPIRED' } });
      await tx.seatHold.deleteMany({ where: { showSeatId } });
    });

    await this.offerSeatToNextInLine(showId, category, showSeatId);
  }

  async getMyWaitlistEntries(userId: string) {
    return this.prisma.waitlist.findMany({
      where: { userId },
      include: { show: true },
      orderBy: { joinedAt: 'desc' },
    });
  }
}