import { Module } from '@nestjs/common';
import { ShowsController } from './shows.controller';
import { ShowsService } from './shows.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShowsController],
  providers: [ShowsService],
})
export class ShowsModule {}