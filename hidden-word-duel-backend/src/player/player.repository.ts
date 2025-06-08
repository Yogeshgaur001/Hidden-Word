import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Player } from './entities/player.entity';

@Injectable()
export class PlayerRepository extends Repository<Player> {
  constructor(dataSource: DataSource) {
    super(Player, dataSource.createEntityManager());
  }

  async findByUsername(username: string): Promise<Player | null> {
    return this.findOne({ where: { username } });
  }
}