import { Injectable } from '@nestjs/common';
import { words } from '../data/words';

interface PlayerState {
  revealedIndices: number[];
  guessedWords: {
    word: string;
    correct: boolean;
    timestamp: number;
  }[];
  completionTime?: number;
  roundsWon: number;
}

export interface GameState {
  roomId: string;
  word: string;
  players: {
    [playerId: string]: PlayerState;
  };
  remainingRounds: number;
  currentRound: number;
  roundStartTime: number;
  winner: string | null;
  isDraw: boolean;
  status: 'waiting' | 'playing' | 'finished';
  player1Id: string;
  player2Id: string;
}

@Injectable()
export class GameService {
  private games = new Map<string, GameState>();
  private gameIntervals = new Map<string, NodeJS.Timeout>();
  private readonly ROUND_DURATION = 10000; // 10 seconds
  private readonly TOTAL_ROUNDS = 5;
  private readonly MIN_REVEALED_LETTERS = 2;

  getRandomWord(): string {
    const randomIndex = Math.floor(Math.random() * words.length);
    return words[randomIndex].toUpperCase();
  }

  createGame(roomId: string, player1Id: string, player2Id: string): GameState {
    const word = this.getRandomWord();
    const initialIndices = this.getInitialRevealedIndices(word);
    
    const gameState: GameState = {
      roomId,
      word,
      players: {
        [player1Id]: {
          revealedIndices: [...initialIndices],
          guessedWords: [],
          roundsWon: 0
        },
        [player2Id]: {
          revealedIndices: [...initialIndices],
          guessedWords: [],
          roundsWon: 0
        }
      },
      remainingRounds: this.TOTAL_ROUNDS,
      currentRound: 1,
      roundStartTime: 0,
      winner: null,
      isDraw: false,
      status: 'waiting',
      player1Id,
      player2Id
    };

    this.games.set(roomId, gameState);
    return gameState;
  }

  private getInitialRevealedIndices(word: string): number[] {
    const indices = Array.from({ length: word.length }, (_, i) => i);
    const shuffled = indices.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, this.MIN_REVEALED_LETTERS);
  }

  startGame(roomId: string): GameState | null {
    const game = this.games.get(roomId);
    if (!game) return null;

    game.status = 'playing';
    game.roundStartTime = Date.now();
    return game;
  }

  guessWord(roomId: string, playerId: string, guessedWord: string): GameState | null {
    const game = this.games.get(roomId);
    if (!game || game.status !== 'playing') return null;

    const now = Date.now();
    const roundElapsed = now - game.roundStartTime;
    
    // Don't accept guesses after round time
    if (roundElapsed >= this.ROUND_DURATION) return game;

    const playerState = game.players[playerId];
    if (!playerState) return game;

    // Normalize both the guess and the game word to uppercase for comparison
    const normalizedGuess = guessedWord.trim().toUpperCase();
    const normalizedWord = game.word.toUpperCase();

    // Debug logging
    console.log('Debug - Word Comparison:', {
      originalGuess: guessedWord,
      normalizedGuess,
      gameWord: game.word,
      normalizedWord,
      isMatch: normalizedGuess === normalizedWord
    });

    // Check if word is correct using normalized comparison
    const isCorrect = normalizedGuess === normalizedWord;

    // Record the guess with original input
    playerState.guessedWords.push({
      word: guessedWord,
      correct: isCorrect,
      timestamp: now
    });

    // If correct, reveal all letters and update player state
    if (isCorrect) {
      playerState.revealedIndices = Array.from({ length: game.word.length }, (_, i) => i);
      playerState.completionTime = now - game.roundStartTime;
      playerState.roundsWon++;
      
      // Check if other player also completed
      const otherPlayerId = playerId === game.player1Id ? game.player2Id : game.player1Id;
      const otherPlayerState = game.players[otherPlayerId];
      const otherPlayerComplete = otherPlayerState.guessedWords.some(g => g.correct);
      
      if (otherPlayerComplete) {
        // Both players completed - compare times
        const otherPlayerTime = otherPlayerState.completionTime!;
        if (playerState.completionTime < otherPlayerTime) {
          game.winner = playerId;
        } else if (playerState.completionTime > otherPlayerTime) {
          game.winner = otherPlayerId;
        } else {
          game.isDraw = true;
        }
        this.endGame(roomId);
      } else {
        // Only this player completed
        game.winner = playerId;
        this.endGame(roomId);
      }
    }

    return game;
  }

  endGame(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game) return;

    game.status = 'finished';
    const interval = this.gameIntervals.get(roomId);
    if (interval) {
      clearInterval(interval);
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