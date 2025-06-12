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