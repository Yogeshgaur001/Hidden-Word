// src/player/player.module.ts (UPDATED)

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from './entities/player.entity';
import { PlayerController } from './player.controller'; // 1. Import the controller
import { PlayerService } from './player.service';
import { PlayerRepository } from './player.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Player])],
  controllers: [PlayerController], // 2. Add the controller here
  providers: [PlayerService, PlayerRepository],
  exports: [PlayerService],
})
export class PlayerModule {}