import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';
import { WaitlistProcessor } from './waitlist.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    BullModule.registerQueue({ name: 'waitlist-offer-expiry' }),
  ],
  controllers: [WaitlistController],
  providers: [WaitlistService, WaitlistProcessor],
  exports: [WaitlistService],
})
export class WaitlistModule {}