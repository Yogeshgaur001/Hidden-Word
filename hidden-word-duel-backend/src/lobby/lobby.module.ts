// src/lobby/lobby.module.ts

import { Module } from '@nestjs/common';
import { LobbyGateway } from './lobby.gateway';
import { GameModule } from '../game/game.module';
import { PlayerModule } from '../player/player.module';

@Module({
  imports: [GameModule, PlayerModule],
  providers: [LobbyGateway],
  exports: [LobbyGateway]
})
export class LobbyModule {}