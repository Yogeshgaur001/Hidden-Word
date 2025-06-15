// src/game/game.service.ts (FINAL CORRECTED VERSION)

import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { words } from '../data/words';
import { PlayerService } from '../player/player.service';
import { MatchService } from '../match/match.service';
import { GuessService } from '../guess/guess.service';
import { RoundService } from '../round/round.service';

interface PlayerState {
  roundsWon: number;
  remainingChances: number;
}

interface GameState {
  roomId: string;
  players: { [playerId: string]: PlayerState };
  status: 'waiting' | 'playing' | 'finished';
  player1Id: string;
  player2Id: string;
  currentRound: number;
  currentWord: string;
  revealedIndices: number[];
  usedWords: string[];
  matchId?: string; // Store match ID for database relations
  currentRoundId?: string; // Store current round ID for database relations
}

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  public readonly TOTAL_CHANCES = 5; // Set to 5 as requested
  public readonly TOTAL_ROUNDS = 5;
  public readonly ROUND_DURATION_SECONDS = 10;
  private readonly INITIAL_REVEALED_LETTERS = 2;

  private games = new Map<string, GameState>();
  private roundTimers = new Map<string, NodeJS.Timeout>();
  private server: Server;

  constructor(
    private readonly playerService: PlayerService,
    private readonly matchService: MatchService,
    private readonly guessService: GuessService,
    private readonly roundService: RoundService,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }
  
  async createGame(roomId: string, player1Id: string, player2Id: string): Promise<GameState> {
    // Create match in database
    const match = await this.matchService.create({
      player1Id,
      player2Id,
      status: 'ongoing'
    });

    const gameState: GameState = {
      roomId,
      players: {
        [player1Id]: { roundsWon: 0, remainingChances: this.TOTAL_CHANCES },
        [player2Id]: { roundsWon: 0, remainingChances: this.TOTAL_CHANCES },
      },
      status: 'waiting',
      player1Id, player2Id,
      currentRound: 0, currentWord: '', revealedIndices: [], usedWords: [],
      matchId: match.id, // Store match ID for database relations
    };
    this.games.set(roomId, gameState);
    this.logger.log(`Created match ${match.id} for game room ${roomId}`);
    return gameState;
  }
  
  async endMatch(roomId: string, reason: string) {
    const gameState = this.games.get(roomId);
    if (!gameState || gameState.status === 'finished') return;

    this.logger.log(`Match ending for room ${roomId}. Reason: ${reason}`);
    gameState.status = 'finished';

    if (this.roundTimers.has(roomId)) {
      clearInterval(this.roundTimers.get(roomId)!);
      this.roundTimers.delete(roomId);
    }

    const player1 = gameState.players[gameState.player1Id];
    const player2 = gameState.players[gameState.player2Id];

    this.logger.log(`Final scores - Player1 (${gameState.player1Id}): ${player1.roundsWon} rounds, Player2 (${gameState.player2Id}): ${player2.roundsWon} rounds`);

    let winnerId: string | null = null;
    if (player1.roundsWon > player2.roundsWon) {
      winnerId = gameState.player1Id;
      this.logger.log(`Winner: Player1 (${gameState.player1Id})`);
    } else if (player2.roundsWon > player1.roundsWon) {
      winnerId = gameState.player2Id;
      this.logger.log(`Winner: Player2 (${gameState.player2Id})`);
    } else {
      this.logger.log('Game ended in a tie');
    }

    // Update match status to completed
    try {
      if (gameState.matchId) {
        await this.matchService.updateStatus(gameState.matchId, 'completed');
        this.logger.log(`Updated match ${gameState.matchId} status to completed`);
      }

      // Update player stats
      if (winnerId) {
        await this.playerService.updateStats(winnerId, true);
        const loserId = winnerId === gameState.player1Id ? gameState.player2Id : gameState.player1Id;
        await this.playerService.updateStats(loserId, false);
      }
    } catch (error) {
      this.logger.error(`Failed to save match results for room ${roomId}:`, error);
    }

    const results = {
      winnerId,
      scores: {
        [gameState.player1Id]: player1.roundsWon,
        [gameState.player2Id]: player2.roundsWon,
      }
    };
    
    // --- MODIFIED LINE ---
    // Emitting the matchOver event with the correct structure.
    this.server.to(roomId).emit('matchOver', {
      winnerId: winnerId || null,
      scores: {
        [gameState.player1Id]: player1.roundsWon,
        [gameState.player2Id]: player2.roundsWon,
      }
    });
    this.cleanupGame(roomId);
  }

  async startNextRound(roomId: string, reason: string = 'New round starting!') {
    const gameState = this.games.get(roomId);
    if (!gameState || !this.server) return;
    
    if (this.roundTimers.has(roomId)) {
      clearInterval(this.roundTimers.get(roomId)!);
      this.roundTimers.delete(roomId);
    }
    
    // --- THIS IS THE CRITICAL FIX ---
    // The check is now '>=' (greater than or equal to).
    // After round 5, `currentRound` is 5. `5 >= 5` is true, so the match ends correctly.
    if (gameState.currentRound >= this.TOTAL_ROUNDS) {
      this.endMatch(roomId, 'All rounds completed.');
      return;
    }
    
    gameState.currentRound++;
    
    const newWord = this.getRandomWord(gameState.usedWords);
    gameState.currentWord = newWord;
    gameState.usedWords.push(newWord);
    gameState.revealedIndices = this.getInitialRevealedIndices(newWord, this.INITIAL_REVEALED_LETTERS);
    gameState.status = 'playing';

    // Create round in database
    try {
      if (gameState.matchId) {
        const match = await this.matchService.findOne(gameState.matchId);
        if (match) {
          const revealedTiles = Array(newWord.length).fill(false);
          gameState.revealedIndices.forEach(index => {
            revealedTiles[index] = true;
          });

          const round = await this.roundService.create({
            match,
            word: newWord,
            revealedTiles,
            roundNumber: gameState.currentRound,
          });
          
          gameState.currentRoundId = round.id;
          this.logger.log(`Created round ${round.id} (${gameState.currentRound}) for match ${gameState.matchId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to create round in database:`, error);
    }

    this.server.to(roomId).emit('roundStart', {
      currentRound: gameState.currentRound,
      word: gameState.currentWord,
      revealedIndices: gameState.revealedIndices,
      message: reason,
    });

    let timeLeft = this.ROUND_DURATION_SECONDS;
    const timer = setInterval(() => {
      this.server.to(roomId).emit('tick', { timeLeft });
      timeLeft--;
      if (timeLeft < 0) {
        this.startNextRound(roomId, 'Time is up! Moving to the next round.').catch(error => {
          this.logger.error(`Error starting next round:`, error);
        });
      }
    }, 1000);
    this.roundTimers.set(roomId, timer);
  }

  async handlePlayerGuess(roomId: string, socketId: string, guessedWord: string) {
    const gameState = this.games.get(roomId);
    if (!gameState) {
      this.logger.warn(`Game state not found for room ${roomId}`);
      return;
    }
    
    const playerId = this.server.sockets.sockets.get(socketId)?.handshake.auth.playerId;
    if (!playerId) {
      this.logger.warn(`Player ID not found for socket ${socketId}`);
      return;
    }

    const playerState = gameState.players[playerId];
    if (!playerState) {
      this.logger.warn(`Player state not found for player ${playerId} in room ${roomId}`);
      return;
    }
    
    if (playerState.remainingChances <= 0) {
      this.logger.warn(`Player ${playerId} has no remaining chances`);
      return;
    }

    const isCorrect = guessedWord.toLowerCase() === gameState.currentWord.toLowerCase();
    this.logger.log(`Player ${playerId} guessed "${guessedWord}" for word "${gameState.currentWord}" - ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);

    // Save guess to database
    try {
      if (gameState.currentRoundId) {
        const round = await this.roundService.findOne(gameState.currentRoundId);
        const player = await this.playerService.findOne(playerId);
        
        if (round && player) {
          await this.guessService.create({
            round,
            player,
            guess: guessedWord,
            isCorrect
          });
          this.logger.log(`Saved guess "${guessedWord}" (${isCorrect ? 'correct' : 'incorrect'}) for player ${playerId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to save guess to database:`, error);
    }

    if (isCorrect) {
      playerState.roundsWon++;
      this.logger.log(`Player ${playerId} now has ${playerState.roundsWon} rounds won`);
      
      // Set round winner in database
      try {
        if (gameState.currentRoundId) {
          const player = await this.playerService.findOne(playerId);
          if (player) {
            await this.roundService.setWinner(gameState.currentRoundId, player);
            this.logger.log(`Set player ${playerId} as winner of round ${gameState.currentRoundId}`);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to set round winner:`, error);
      }

      const playerUsername = this.server.sockets.sockets.get(socketId)?.handshake.auth.username || 'A player';
      this.startNextRound(roomId, `${playerUsername} guessed correctly!`).catch(error => {
        this.logger.error(`Error starting next round:`, error);
      });
    } else {
      playerState.remainingChances--;
      this.server.to(socketId).emit('wordGuessed', {
        success: false,
        message: `Incorrect. You have ${playerState.remainingChances} chances left.`,
        remainingChances: playerState.remainingChances,
      });

      if (playerState.remainingChances <= 0) {
        this.server.to(socketId).emit('gameOver', { reason: 'You have run out of chances!' });
      }
    }
  }

  cleanupGame(roomId: string): void {
    if (this.roundTimers.has(roomId)) {
      clearInterval(this.roundTimers.get(roomId)!);
      this.roundTimers.delete(roomId);
    }
    this.games.delete(roomId);
  }
  
  private getRandomWord(usedWords: string[] = []): string { const availableWords = words.filter(word => !usedWords.includes(word)); if (availableWords.length === 0) { throw new Error('No more unique words available'); } const randomIndex = Math.floor(Math.random() * availableWords.length); return availableWords[randomIndex]; }
  private getInitialRevealedIndices(word: string, count: number): number[] { const indices = Array.from({ length: word.length }, (_, i) => i); for (let i = indices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [indices[i], indices[j]] = [indices[j], indices[i]]; } return indices.slice(0, count); }
}