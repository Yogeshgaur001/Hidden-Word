import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guess } from './entities/guess.entity';
import { Round } from '../round/entities/round.entity';
import { Player } from '../player/entities/player.entity';

interface CreateGuessDto {
  round: Round;
  player: Player;
  guess: string;
  isCorrect: boolean;
}

@Injectable()
export class GuessService {
  constructor(
    @InjectRepository(Guess)
    private readonly guessRepository: Repository<Guess>,
  ) {}

  async create(createGuessDto: CreateGuessDto): Promise<Guess> {
    const guess = this.guessRepository.create(createGuessDto);
    return this.guessRepository.save(guess);
  }

  async findByRound(roundId: string): Promise<Guess[]> {
    return this.guessRepository.find({
      where: { round: { id: roundId } },
      relations: ['player', 'round'],
      order: { timestamp: 'ASC' },
    });
  }

  async findByPlayer(playerId: string): Promise<Guess[]> {
    return this.guessRepository.find({
      where: { player: { id: playerId } },
      relations: ['player', 'round'],
      order: { timestamp: 'ASC' },
    });
  }
} 