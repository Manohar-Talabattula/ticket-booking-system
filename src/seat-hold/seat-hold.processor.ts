import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('seat-hold-expiry')
export class SeatHoldProcessor extends WorkerHost {
  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    const { showSeatId } = job.data;

    const hold = await this.prisma.seatHold.findUnique({ where: { showSeatId } });
    if (!hold) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.seatHold.delete({ where: { showSeatId } });
      await tx.showSeat.update({ where: { id: showSeatId }, data: { status: 'AVAILABLE' } });
    });

    console.log(`Hold expired and released: seat ${showSeatId}`);
  }
}