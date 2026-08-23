import { Controller, Post, Get, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingService } from './booking.service';

@Controller('bookings')
@UseGuards(AuthGuard('jwt'))
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @Post(':showSeatId')
  confirm(@Param('showSeatId') showSeatId: string, @Req() req: any) {
    return this.bookingService.confirmBooking(showSeatId, req.user.userId);
  }

  @Get()
  history(@Req() req: any) {
    return this.bookingService.getBookingHistory(req.user.userId);
  }

  @Delete(':id')
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.bookingService.cancelBooking(id, req.user.userId);
  }
}