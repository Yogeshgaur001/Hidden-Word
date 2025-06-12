import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Word } from './entities/word.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Word])],
  exports: [TypeOrmModule],
})
export class WordModule {}