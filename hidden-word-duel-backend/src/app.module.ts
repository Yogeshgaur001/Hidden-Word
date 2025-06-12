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
      autoLoadEntities: true,
      synchronize: true,
    }),
    LobbyModule,
    GameModule,
    WordModule,
    RoundModule,
    GuessModule, 
    PlayerModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}