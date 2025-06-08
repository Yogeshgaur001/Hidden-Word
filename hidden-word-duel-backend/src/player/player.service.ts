// src/player/player.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Player } from './entities/player.entity';
import { PlayerRepository } from './player.repository';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  constructor(
    private readonly playerRepository: PlayerRepository
  ) {}

  /**
   * Finds a player by their ID. If they don't exist, a new player is created.
   * This is perfect for players connecting for the first time.
   */
  async findOrCreate(playerId: string, username?: string): Promise<Player> {
    let player = await this.playerRepository.findOne({ 
      where: { id: playerId } 
    });

    if (!player) {
      this.logger.log(`Player with ID ${playerId} not found. Creating new player.`);
      const newPlayer = this.playerRepository.create({
        id: playerId,
        // Use the provided username or create a default one.
        username: username || `Player_${playerId.substring(0, 8)}`,
      });
      player = await this.playerRepository.save(newPlayer);
    }

    return player;
  }

  async findOne(id: string): Promise<Player | null> {
    return this.playerRepository.findOneBy({ id });
  }

  async create(username: string): Promise<Player> {
    const player = this.playerRepository.create({ username });
    return this.playerRepository.save(player);
  }

  async updateStats(id: string, won: boolean): Promise<Player | null> {
    const player = await this.findOne(id);
    if (!player) return null;

    player.gamesPlayed++;
    if (won) player.gamesWon++;

    return this.playerRepository.save(player);
  }
}