import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WaitlistService } from './waitlist.service';

@Processor('waitlist-offer-expiry')
export class WaitlistProcessor extends WorkerHost {
  constructor(private waitlistService: WaitlistService) {
    super();
  }

  async process(job: Job) {
    const { waitlistId, showId, category, showSeatId } = job.data;
    await this.waitlistService.expireOffer(waitlistId, showId, category, showSeatId);
    console.log(`Waitlist offer expired for entry ${waitlistId}, tried next in line`);
  }
}