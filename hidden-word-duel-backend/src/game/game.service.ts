import { Injectable } from '@nestjs/common';
import { words } from '../data/words';

export interface GameState {
  roomId: string;
  word: string;
  revealedIndices: number[];
  guessedWords: {
    [playerId: string]: string;
  };
  winner: string | null;
  isDraw: boolean;
  currentTick: number;
  status: 'waiting' | 'playing' | 'finished';
  player1Id: string;
  player2Id: string;
}

@Injectable()
export class GameService {
  private games = new Map<string, GameState>();
  private gameIntervals = new Map<string, NodeJS.Timeout>();

  getRandomWord(): string {
    const randomIndex = Math.floor(Math.random() * words.length);
    return words[randomIndex];
  }

  createGame(roomId: string, player1Id: string, player2Id: string): GameState {
    const word = this.getRandomWord();
    const gameState: GameState = {
      roomId,
      word,
      revealedIndices: [],
      guessedWords: {},
      winner: null,
      isDraw: false,
      currentTick: 0,
      status: 'waiting',
      player1Id,
      player2Id
    };

    this.games.set(roomId, gameState);
    return gameState;
  }

  startGame(roomId: string): GameState | null {
    const game = this.games.get(roomId);
    if (!game) return null;

    game.status = 'playing';
    
    // Clear any existing interval
    if (this.gameIntervals.has(roomId)) {
      clearInterval(this.gameIntervals.get(roomId));
    }

    // Start revealing letters every 5 seconds
    const interval = setInterval(() => {
      const game = this.games.get(roomId);
      if (!game || game.status !== 'playing') {
        clearInterval(interval);
        return;
      }

      // Get unrevealed indices
      const unrevealedIndices = Array.from(
        { length: game.word.length },
        (_, i) => i
      ).filter(i => !game.revealedIndices.includes(i));

      // If all letters are revealed, end the game
      if (unrevealedIndices.length === 0) {
        this.endGame(roomId);
        clearInterval(interval);
        return;
      }

      // Reveal a random letter
      const randomIndex = Math.floor(Math.random() * unrevealedIndices.length);
      game.revealedIndices.push(unrevealedIndices[randomIndex]);
      game.currentTick++;
    }, 5000);

    this.gameIntervals.set(roomId, interval);
    return game;
  }

  submitGuess(roomId: string, playerId: string, guess: string): GameState | null {
    const game = this.games.get(roomId);
    if (!game || game.status !== 'playing') return null;

    // Record the guess
    game.guessedWords[playerId] = guess;

    // Check if the guess is correct
    if (guess.toUpperCase() === game.word) {
      // Check if both players guessed correctly at the same time
      const otherPlayerId = playerId === game.player1Id ? game.player2Id : game.player1Id;
      if (game.guessedWords[otherPlayerId]?.toUpperCase() === game.word) {
        game.isDraw = true;
        game.winner = null;
      } else {
        game.winner = playerId;
      }
      this.endGame(roomId);
    }

    return game;
  }

  private endGame(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game) return;

    game.status = 'finished';
    if (this.gameIntervals.has(roomId)) {
      clearInterval(this.gameIntervals.get(roomId));
      this.gameIntervals.delete(roomId);
    }
  }

  getGame(roomId: string): GameState | null {
    return this.games.get(roomId) || null;
  }

  cleanupGame(roomId: string): void {
    if (this.gameIntervals.has(roomId)) {
      clearInterval(this.gameIntervals.get(roomId));
      this.gameIntervals.delete(roomId);
    }
    this.games.delete(roomId);
  }
} 