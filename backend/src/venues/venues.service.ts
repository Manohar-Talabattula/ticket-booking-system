import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { CreateSeatDto } from './dto/create-seat.dto';

@Injectable()
export class VenuesService {
  constructor(private prisma: PrismaService) {}

  createVenue(dto: CreateVenueDto, organiserId: string) {
    return this.prisma.venue.create({
      data: {
        name: dto.name,
        address: dto.address,
        organiserId,
      },
    });
  }

  async addSeat(venueId: string, dto: CreateSeatDto) {
    const venue = await this.prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return this.prisma.seat.create({
      data: {
        row: dto.row,
        number: dto.number,
        category: dto.category,
        venueId,
      },
    });
  }

  findAll() {
    return this.prisma.venue.findMany({
      include: { seats: true },
    });
  }

  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: { seats: true },
    });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }
    return venue;
  }
}