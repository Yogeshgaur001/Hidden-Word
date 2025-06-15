import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { PlayerModule } from '../player/player.module';
import { MatchModule } from '../match/match.module';
import { GuessModule } from '../guess/guess.module';
import { RoundModule } from '../round/round.module';
import { ConfigModule } from '@nestjs/config'; // <-- IMPORT THIS MODULE

@Module({
  imports: [
    PlayerModule,
    MatchModule,
    GuessModule,
    RoundModule,
    ConfigModule, // <-- ADD THIS LINE. This makes ConfigService available to GameGateway.
  ],
  providers: [GameGateway, GameService],
  exports: [GameService]
})
export class GameModule {}