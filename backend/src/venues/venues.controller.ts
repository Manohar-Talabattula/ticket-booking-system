import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { CreateSeatDto } from './dto/create-seat.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('venues')
export class VenuesController {
  constructor(private venuesService: VenuesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateVenueDto, @Req() req: any) {
    return this.venuesService.createVenue(dto, req.user.userId);
  }

  @Post(':id/seats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  addSeat(@Param('id') venueId: string, @Body() dto: CreateSeatDto) {
    return this.venuesService.addSeat(venueId, dto);
  }

  @Get()
  findAll() {
    return this.venuesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.venuesService.findOne(id);
  }
}