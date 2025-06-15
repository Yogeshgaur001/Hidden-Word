import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LobbyModule } from './lobby/lobby.module';
import { GameModule } from './game/game.module';
import { PlayerModule } from './player/player.module';
import { RoundModule } from './round/round.module';
import { GuessModule } from './guess/guess.module';
import { WordModule } from './word/word.module';
import { Player } from './player/entities/player.entity'; // Import the Player entity
import { Guess } from './guess/entities/guess.entity'; // Import the Guess entity
import { Word } from './word/entities/word.entity'; // Import the Word entity
import { Round } from './round/entities/round.entity'; // Import the Round entity
import { Match } from './match/entities/match.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'hidden_word_duel_db',
      logging: true,
      entities: [Player, Guess, Word, Round, Match], // Add all your entities here
      // autoLoadEntities: true,
      synchronize: true,
    }),
    LobbyModule,
    GameModule,
    WordModule,
    RoundModule,
    GuessModule,
    PlayerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
