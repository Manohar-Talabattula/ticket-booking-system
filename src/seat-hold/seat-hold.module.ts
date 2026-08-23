import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SeatHoldController } from './seat-hold.controller';
import { SeatHoldService } from './seat-hold.service';
import { SeatHoldProcessor } from './seat-hold.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { getRedisConnection } from '../config/redis.config';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: getRedisConnection(),
    }),
    BullModule.registerQueue({
      name: 'seat-hold-expiry',
    }),
  ],
  controllers: [SeatHoldController],
  providers: [SeatHoldService, SeatHoldProcessor],
})
export class SeatHoldModule {}