// src/lobby/lobby.module.ts

import { Module } from '@nestjs/common';
import { LobbyGateway } from './lobby.gateway';
import { GameModule } from '../game/game.module';

@Module({
  imports: [GameModule],
  providers: [LobbyGateway],
  exports: [LobbyGateway]
})
export class LobbyModule {}