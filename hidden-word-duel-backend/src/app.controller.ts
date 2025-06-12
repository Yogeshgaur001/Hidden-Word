import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { PlayerService } from './player/player.service';

@Controller()
export class AppController {
  constructor(private readonly playerService: PlayerService) {}

  @Get('player/:id')
  async getPlayer(@Param('id') id: string) {
    return this.playerService.findOne(id);
  }

  @Post('player')
  async createPlayer(@Body() data: { username: string }) {
    return this.playerService.create(data.username);
  }

  @Patch('player/:id')
  async updatePlayer(@Param('id') id: string, @Body() data: any) {
    return this.playerService.update(id, data);
  }
}
