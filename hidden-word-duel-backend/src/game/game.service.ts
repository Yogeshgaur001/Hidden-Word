// src/game/game.service.ts (FINAL CORRECTED VERSION)

import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { words } from '../data/words';
import { PlayerService } from '../player/player.service';
import { MatchService } from '../match/match.service';

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
  ) {}

  setServer(server: Server) {
    this.server = server;
  }
  
  async createGame(roomId: string, player1Id: string, player2Id: string): Promise<GameState> {
    const gameState: GameState = {
      roomId,
      players: {
        [player1Id]: { roundsWon: 0, remainingChances: this.TOTAL_CHANCES },
        [player2Id]: { roundsWon: 0, remainingChances: this.TOTAL_CHANCES },
      },
      status: 'waiting',
      player1Id, player2Id,
      currentRound: 0, currentWord: '', revealedIndices: [], usedWords: [],
    };
    this.games.set(roomId, gameState);
    return gameState;
  }
  
  endMatch(roomId: string, reason: string) {
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

    let winnerId: string | null = null;
    if (player1.roundsWon > player2.roundsWon) {
      winnerId = gameState.player1Id;
    } else if (player2.roundsWon > player1.roundsWon) {
      winnerId = gameState.player2Id;
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

  startNextRound(roomId: string, reason: string = 'New round starting!') {
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
        this.startNextRound(roomId, 'Time is up! Moving to the next round.');
      }
    }, 1000);
    this.roundTimers.set(roomId, timer);
  }

  handlePlayerGuess(roomId: string, socketId: string, guessedWord: string) {
    const gameState = this.games.get(roomId);
    if (!gameState) return;
    
    const playerId = this.server.sockets.sockets.get(socketId)?.handshake.auth.playerId;
    if (!playerId) return;

    const playerState = gameState.players[playerId];
    if (!playerState || playerState.remainingChances <= 0) return;

    const isCorrect = guessedWord.toLowerCase() === gameState.currentWord.toLowerCase();

    if (isCorrect) {
      playerState.roundsWon++;
      const playerUsername = this.server.sockets.sockets.get(socketId)?.handshake.auth.username || 'A player';
      this.startNextRound(roomId, `${playerUsername} guessed correctly!`);
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