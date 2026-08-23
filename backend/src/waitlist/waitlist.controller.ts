import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
@UseGuards(AuthGuard('jwt'))
export class WaitlistController {
  constructor(private waitlistService: WaitlistService) {}

  @Post()
  join(@Body() body: { showId: string; category: 'PREMIUM' | 'STANDARD' | 'ECONOMY' }, @Req() req: any) {
    return this.waitlistService.joinWaitlist(body.showId, body.category, req.user.userId);
  }

  @Get()
  myEntries(@Req() req: any) {
    return this.waitlistService.getMyWaitlistEntries(req.user.userId);
  }
}