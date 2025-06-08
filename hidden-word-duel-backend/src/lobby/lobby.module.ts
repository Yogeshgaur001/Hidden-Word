// src/lobby/lobby.module.ts

import { Module } from '@nestjs/common';
import { PlayerModule } from '../player/player.module';
import { LobbyGateway } from './lobby.gateway';

@Module({
  imports: [PlayerModule],
  providers: [LobbyGateway],
})
export class LobbyModule {}