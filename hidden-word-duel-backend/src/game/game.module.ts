/*import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { PlayerModule } from '../player/player.module';
import { MatchModule } from '../match/match.module';

@Module({
  imports: [
    PlayerModule,
    MatchModule
  ],
  providers: [GameGateway, GameService],
  exports: [GameService]
})
export class GameModule {} */

// src/game/game.module.ts (FINAL)

import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { PlayerModule } from '../player/player.module';
import { MatchModule } from '../match/match.module';
import { ConfigModule } from '@nestjs/config'; // <-- IMPORT THIS MODULE

@Module({
  imports: [
    PlayerModule,
    MatchModule,
    ConfigModule, // <-- ADD THIS LINE. This makes ConfigService available to GameGateway.
  ],
  providers: [GameGateway, GameService],
  exports: [GameService]
})
export class GameModule {}