import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guess } from './entities/guess.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Guess])],
  exports: [TypeOrmModule],
})
export class GuessModule {}