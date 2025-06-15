import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Round } from './entities/round.entity';
import { Match } from '../match/entities/match.entity';
import { Player } from '../player/entities/player.entity';

interface CreateRoundDto {
  match: Match;
  word: string;
  revealedTiles: boolean[];
  roundNumber: number;
}

@Injectable()
export class RoundService {
  constructor(
    @InjectRepository(Round)
    private readonly roundRepository: Repository<Round>,
  ) {}

  async create(createRoundDto: CreateRoundDto): Promise<Round> {
    const round = this.roundRepository.create(createRoundDto);
    return this.roundRepository.save(round);
  }

  async findByMatch(matchId: string): Promise<Round[]> {
    return this.roundRepository.find({
      where: { match: { id: matchId } },
      relations: ['match', 'winner'],
      order: { roundNumber: 'ASC' },
    });
  }

  async setWinner(roundId: string, winner: Player): Promise<Round> {
    const round = await this.roundRepository.findOne({
      where: { id: roundId },
      relations: ['match', 'winner'],
    });
    
    if (!round) {
      throw new Error(`Round ${roundId} not found`);
    }

    round.winner = winner;
    round.endedAt = new Date();
    return this.roundRepository.save(round);
  }

  async findOne(id: string): Promise<Round | null> {
    return this.roundRepository.findOne({
      where: { id },
      relations: ['match', 'winner'],
    });
  }
} 