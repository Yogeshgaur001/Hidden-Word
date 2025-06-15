// src/player/player.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from './entities/player.entity';
import { PlayerRepository } from './player.repository';
import { CreatePlayerDto } from './dto/create-player.dto';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  constructor(
    private readonly playerRepository: PlayerRepository,
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
  ) {}

  /**
   * Finds a player by their ID. If they don't exist, a new player is created.
   * This is perfect for players connecting for the first time.
   */
  async findOrCreate(playerId: string, username?: string): Promise<Player> {
    let player = await this.playerRepo.findOne({ 
      where: { id: playerId } 
    });

    if (!player) {
      this.logger.log(`Player with ID ${playerId} not found. Creating new player.`);
      const newPlayer = this.playerRepo.create({
        id: playerId,
        // Use the provided username or create a default one.
        username: username || `Player_${playerId.substring(0, 8)}`,
      });
      player = await this.playerRepo.save(newPlayer);
      this.logger.log(`Created new player: ${player.id} - ${player.username}`);
    } else {
      this.logger.log(`Found existing player: ${player.id} - ${player.username}`);
    }

    return player;
  }

  async findOne(id: string): Promise<Player | null> {
    return this.playerRepo.findOne({ where: { id } });
  }

  async create(username: string): Promise<Player> {
    const player = this.playerRepo.create({ username });
    return this.playerRepo.save(player);
  }

  async updateStats(id: string, won: boolean): Promise<Player | null> {
    const player = await this.findOne(id);
    if (!player) {
      this.logger.warn(`Player ${id} not found for stats update`);
      return null;
    }

    if (won) player.totalWins++;

    const updatedPlayer = await this.playerRepo.save(player);
    this.logger.log(`Updated player stats: ${updatedPlayer.id} - Wins: ${updatedPlayer.totalWins}`);
    return updatedPlayer;
  }

  async update(id: string, data: Partial<Player>): Promise<Player | null> {
    const player = await this.findOne(id);
    if (!player) return null;

    // Update allowed fields
    if (data.username) player.username = data.username;
    if (typeof data.totalWins === 'number') player.totalWins = data.totalWins;

    return this.playerRepo.save(player);
  }

  async createOrUpdatePlayer(playerData: CreatePlayerDto): Promise<Player> {
    console.log('🎮 Creating/Updating Player:', {
      playerId: playerData.playerId,
      username: playerData.username
    });
    return await this.playerRepo.save(playerData);
  }
}