import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { PlayerService } from '../player/player.service';

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    private readonly playerService: PlayerService,
  ) {}

  async createMatch(player1Id: string, player2Id: string): Promise<Match> {
    try {
      // Find or create both players
      const [player1, player2] = await Promise.all([
        this.playerService.findOrCreate(player1Id),
        this.playerService.findOrCreate(player2Id),
      ]);

      // Create new match instance
      const newMatch = this.matchRepository.create({
        player1,
        player2,
        status: 'active',
      });

      // Save to database
      const savedMatch = await this.matchRepository.save(newMatch);
      this.logger.log(`Created new match ${savedMatch.id} between players ${player1Id} and ${player2Id}`);

      return savedMatch;
    } catch (error) {
      this.logger.error(`Failed to create match: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(matchId: string): Promise<Match> {
    try {
      const match = await this.matchRepository.findOne({
        where: { id: matchId },
        relations: ['player1', 'player2'],
      });

      if (!match) {
        throw new NotFoundException(`Match with ID ${matchId} not found`);
      }

      return match;
    } catch (error) {
      this.logger.error(`Failed to find match ${matchId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateMatchStatus(matchId: string, status: 'active' | 'completed' | 'cancelled'): Promise<Match> {
    try {
      const match = await this.findById(matchId);
      match.status = status;

      const updatedMatch = await this.matchRepository.save(match);
      this.logger.log(`Updated match ${matchId} status to ${status}`);

      return updatedMatch;
    } catch (error) {
      this.logger.error(`Failed to update match ${matchId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getActiveMatches(): Promise<Match[]> {
    try {
      return await this.matchRepository.find({
        where: { status: 'active' },
        relations: ['player1', 'player2'],
      });
    } catch (error) {
      this.logger.error(`Failed to get active matches: ${error.message}`, error.stack);
      throw error;
    }
  }
}