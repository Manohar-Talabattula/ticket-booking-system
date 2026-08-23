import { Controller, Post, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SeatHoldService } from './seat-hold.service';

@Controller('seat-hold')
@UseGuards(AuthGuard('jwt'))
export class SeatHoldController {
  constructor(private seatHoldService: SeatHoldService) {}

  @Post(':showSeatId')
  create(@Param('showSeatId') showSeatId: string, @Req() req: any) {
    return this.seatHoldService.createHold(showSeatId, req.user.userId);
  }

  @Delete(':showSeatId')
  release(@Param('showSeatId') showSeatId: string, @Req() req: any) {
    return this.seatHoldService.releaseHold(showSeatId, req.user.userId);
  }
}