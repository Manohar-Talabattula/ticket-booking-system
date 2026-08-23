import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

const HOLD_TTL_MINUTES = 0.2;

@Injectable()
export class SeatHoldService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('seat-hold-expiry') private holdQueue: Queue,
  ) {}

  async createHold(showSeatId: string, userId: string) {
    const showSeat = await this.prisma.showSeat.findUnique({ where: { id: showSeatId } });
    if (!showSeat) {
      throw new NotFoundException('Seat not found for this show');
    }
    if (showSeat.status !== 'AVAILABLE') {
      throw new ConflictException('Seat is not available');
    }

    const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000);

    try {
      const hold = await this.prisma.$transaction(async (tx) => {
        // This create will THROW if a hold already exists for this showSeatId,
        // because SeatHold.showSeatId is @unique in the schema.
        // Postgres itself is the concurrency lock — not application logic.
        const newHold = await tx.seatHold.create({
          data: { showSeatId, userId, expiresAt },
        });

        await tx.showSeat.update({
          where: { id: showSeatId },
          data: { status: 'HELD' },
        });

        return newHold;
      });

      // Schedule the auto-release job to run exactly at expiry time.
      await this.holdQueue.add(
        'release-hold',
        { holdId: hold.id, showSeatId },
        { delay: HOLD_TTL_MINUTES * 60 * 1000, jobId: hold.id },
      );

      return hold;
    } catch (err: any) {
      // Postgres unique constraint violation code
      if (err.code === 'P2002') {
        throw new ConflictException('Seat was just taken by another customer');
      }
      throw err;
    }
  }

  async releaseHold(showSeatId: string, userId: string) {
    const hold = await this.prisma.seatHold.findUnique({ where: { showSeatId } });
    if (!hold || hold.userId !== userId) {
      throw new BadRequestException('No active hold found for this user on this seat');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.seatHold.delete({ where: { showSeatId } });
      await tx.showSeat.update({ where: { id: showSeatId }, data: { status: 'AVAILABLE' } });
    });

    // Cancel the scheduled auto-release job since it's no longer needed
    const job = await this.holdQueue.getJob(hold.id);
    if (job) await job.remove();

    return { message: 'Hold released' };
  }
}