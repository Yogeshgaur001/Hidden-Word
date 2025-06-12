// src/player/player.controller.ts (NEW FILE)

import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { PlayerService } from './player.service';
import { Player } from './entities/player.entity';

// Define a DTO (Data Transfer Object) for creating a player
class CreatePlayerDto {
  id: string;
  username: string;
}

@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  // This handles the POST /player request from your frontend
  @Post()
  async create(@Body() createPlayerDto: CreatePlayerDto): Promise<Player> {
    // We use the findOrCreate method which is robust
    // It will create the player if they don't exist, or find them if they do.
    // CRUCIALLY, it RETURNS the player object, which gets sent as JSON.
    return this.playerService.findOrCreate(createPlayerDto.id, createPlayerDto.username);
  }

  // This handles the GET /player/:id request
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Player | null> {
    return this.playerService.findOne(id);
  }
}