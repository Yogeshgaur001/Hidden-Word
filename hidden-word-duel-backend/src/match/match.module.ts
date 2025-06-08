import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchService } from './match.service';
import { Match } from './entities/match.entity';
import { PlayerModule } from '../player/player.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match]),
    PlayerModule
  ],
  providers: [MatchService],
  exports: [MatchService]
})
export class MatchModule {}