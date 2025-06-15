import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Round } from './entities/round.entity';
import { RoundService } from './round.service';

@Module({
  imports: [TypeOrmModule.forFeature([Round])],
  providers: [RoundService],
  exports: [TypeOrmModule, RoundService],
})
export class RoundModule {}