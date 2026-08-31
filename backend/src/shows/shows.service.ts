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

  async getShowSeatDetails(showSeatId: string) {
    const showSeat = await this.prisma.showSeat.findUnique({
      where: { id: showSeatId },
      include: {
        show: { include: { venue: true } },
        seat: true,
        hold: true,
      },
    });
    if (!showSeat) {
      throw new NotFoundException('Seat not found');
    }
    return showSeat;
  }
}