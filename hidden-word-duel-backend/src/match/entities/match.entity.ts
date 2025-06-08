import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Player } from '../../player/entities/player.entity';

@Entity()
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'player1Id' })
  player1: Player;

  @Column()
  player1Id: string;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'player2Id' })
  player2: Player;

  @Column()
  player2Id: string;

  @Column()
  status: string;
}