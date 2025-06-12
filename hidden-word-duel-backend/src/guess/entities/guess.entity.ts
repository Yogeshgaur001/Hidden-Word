import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Round } from '../../round/entities/round.entity';
import { Player } from '../../player/entities/player.entity';

@Entity()
export class Guess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Round)
  round: Round;

  @ManyToOne(() => Player)
  player: Player;

  @Column('text')
  guess: string;

  @Column()
  isCorrect: boolean;

  @CreateDateColumn()
  timestamp: Date;
}