// src/player/entities/player.entity.ts

import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ default: 0 })
  gamesPlayed: number;

  @Column({ default: 0 })
  gamesWon: number;
}