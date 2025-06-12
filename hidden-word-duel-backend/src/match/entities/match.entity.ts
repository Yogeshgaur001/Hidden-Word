import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Player } from '../../player/entities/player.entity';

@Entity()
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  player1Id: string;

  @Column('uuid')
  player2Id: string;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'player1Id' })
  player1: Player;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'player2Id' })
  player2: Player;

  @Column({ default: 0 })
  score1: number;

  @Column({ default: 0 })
  score2: number;

  @Column({ type: 'text', default: 'ongoing' })
  status: 'ongoing' | 'completed';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}