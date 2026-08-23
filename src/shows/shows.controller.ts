import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShowsService } from './shows.service';
import { CreateShowDto } from './dto/create-show.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('shows')
export class ShowsController {
  constructor(private showsService: ShowsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ORGANISER')
  create(@Body() dto: CreateShowDto, @Req() req: any) {
    return this.showsService.createShow(dto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.showsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.showsService.findOne(id);
  }
}