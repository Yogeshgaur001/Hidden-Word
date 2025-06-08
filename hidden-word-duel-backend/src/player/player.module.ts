// src/player/player.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from './entities/player.entity';
import { PlayerRepository } from './player.repository';
import { PlayerService } from './player.service';

@Module({
  imports: [TypeOrmModule.forFeature([Player])],
  providers: [PlayerRepository, PlayerService],
  exports: [PlayerService],
})
export class PlayerModule {}