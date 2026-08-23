import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { WaitlistModule } from '../waitlist/waitlist.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    WaitlistModule,
    BullModule.registerQueue({ name: 'seat-hold-expiry' }),
  ],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}