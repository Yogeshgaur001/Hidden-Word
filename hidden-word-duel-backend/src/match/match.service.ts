import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './entities/match.entity';

interface CreateMatchDto {
  player1Id: string;
  player2Id: string;
  status: 'ongoing' | 'completed';
}

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>
  ) {}

  async create(createMatchDto: CreateMatchDto): Promise<Match> {
    const match = this.matchRepository.create(createMatchDto);
    return this.matchRepository.save(match);
  }

  async findOne(id: string): Promise<Match | null> {
    return this.matchRepository.findOne({
      where: { id },
      relations: ['player1', 'player2']
    });
  }

  async updateStatus(id: string, status: 'ongoing' | 'completed'): Promise<Match | null> {
    const match = await this.findOne(id);
    if (!match) return null;

    match.status = status;
    return this.matchRepository.save(match);
  }

  async getPlayerMatches(playerId: string): Promise<Match[]> {
    return this.matchRepository.find({
      where: [
        { player1Id: playerId },
        { player2Id: playerId }
      ],
      relations: ['player1', 'player2']
    });
  }

  async getActiveMatches(): Promise<Match[]> {
    return this.matchRepository.find({
      where: { status: 'ongoing' }, // Use 'ongoing' not 'playing'
      relations: ['player1', 'player2']
    });
  }
}