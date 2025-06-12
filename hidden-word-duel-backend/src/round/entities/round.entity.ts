import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Match } from '../../match/entities/match.entity';
import { Player } from '../../player/entities/player.entity';

@Entity()
export class Round {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Match)
  match: Match;

  @Column('text')
  word: string;

  @Column('boolean', { array: true })
  revealedTiles: boolean[];

  @ManyToOne(() => Player, { nullable: true })
  winner: Player;

  @Column()
  roundNumber: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;
}