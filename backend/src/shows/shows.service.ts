import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShowDto } from './dto/create-show.dto';

@Injectable()
export class ShowsService {
  constructor(private prisma: PrismaService) {}

  async createShow(dto: CreateShowDto, organiserId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: dto.venueId },
      include: { seats: true },
    });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    // Create the show, its pricing rows, and a ShowSeat row for every
    // physical seat in the venue — all in one transaction so it's all-or-nothing.
    return this.prisma.$transaction(async (tx) => {
      const show = await tx.show.create({
        data: {
          title: dto.title,
          date: new Date(dto.date),
          venueId: dto.venueId,
          organiserId,
        },
      });

      await tx.showPricing.createMany({
        data: dto.pricing.map((p) => ({
          showId: show.id,
          category: p.category,
          price: p.price,
        })),
      });

      await tx.showSeat.createMany({
        data: venue.seats.map((seat) => ({
          showId: show.id,
          seatId: seat.id,
          status: 'AVAILABLE',
        })),
      });

      return show;
    });
  }

  findAll() {
    return this.prisma.show.findMany({
      include: { venue: true, prices: true },
    });
  }

  async findOne(id: string) {
    const show = await this.prisma.show.findUnique({
      where: { id },
      include: {
        venue: true,
        prices: true,
        showSeats: { include: { seat: true } },
      },
    });
    if (!show) {
      throw new NotFoundException('Show not found');
    }
    return show;
  }
}