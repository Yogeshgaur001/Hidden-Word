/*import { Injectable } from '@nestjs/common';
import { PlayerService } from '../player/player.service';
import { MatchService } from '../match/match.service';
import { words } from '../data/words';

interface PlayerState {
  revealedIndices: number[];
  guessedWords: {
    word: string;
    correct: boolean;
    timestamp: number;
  }[];
  roundsWon: number;
  remainingChances: number;  // Track remaining chances per player
  currentRound: number;      // Track round per player
  currentWord: string;       // Individual word for each player
  usedWords: string[];      // Track used words per player
  gameStatus: 'waiting' | 'playing' | 'finished';
}

interface GameState {
  roomId: string;
  players: {
    [playerId: string]: PlayerState;
  };
  status: 'waiting' | 'playing' | 'finished';
  player1Id: string;
  player2Id: string;
}

interface GameResult {
  success: boolean;
  message: string;
  newRound?: boolean;
  newWord?: string;
  remainingChances: number;
  currentRound: number;
  revealedIndices?: number[];  // Add this
  gameOver?: boolean;         // Add this
}

@Injectable()
export class GameService {
  public readonly TOTAL_CHANCES = 5;
  private readonly ROUND_DURATION = 10000; // 10 seconds
  private readonly INITIAL_REVEALED_LETTERS = 2;
  private readonly games = new Map<string, GameState>();
  private readonly playerIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly playerService: PlayerService,
    private readonly matchService: MatchService
  ) {}

  getGameState(roomId: string): GameState | null {
    return this.games.get(roomId) || null;
  }

  getRandomWord(usedWords: string[] = []): string {
    // Filter out all previously used words
    const availableWords = words.filter(word => !usedWords.includes(word));
    
    // If no words are available, throw an error - we should never reuse words
    if (availableWords.length === 0) {
      throw new Error('No more unique words available');
    }
    
    // Select a random word from available words
    const randomIndex = Math.floor(Math.random() * availableWords.length);
    return availableWords[randomIndex];
  }

  private getInitialRevealedIndices(word: string, count: number): number[] {
    const indices: number[] = [];
    const availableIndices = Array.from({ length: word.length }, (_, i) => i);
    
    // Shuffle available indices
    for (let i = availableIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
    }
    
    // Take the first 'count' indices
    return availableIndices.slice(0, count);
  }

  async createGame(roomId: string, player1Id: string, player2Id: string): Promise<GameState> {
    // Create or update players in database
    await this.playerService.findOrCreate(player1Id);
    await this.playerService.findOrCreate(player2Id);
    
    // Create a new match in database
    await this.matchService.create({
      player1Id,
      player2Id,
      status: 'waiting'
    });
    
    const gameState: GameState = {
      roomId,
      players: {
        [player1Id]: {
          revealedIndices: [],
          guessedWords: [],
          roundsWon: 0,
          remainingChances: this.TOTAL_CHANCES,
          currentRound: 1,
          currentWord: '',
          usedWords: [],
          gameStatus: 'waiting'
        },
        [player2Id]: {
          revealedIndices: [],
          guessedWords: [],
          roundsWon: 0,
          remainingChances: this.TOTAL_CHANCES,
          currentRound: 1,
          currentWord: '',
          usedWords: [],
          gameStatus: 'waiting'
        }
      },
      status: 'waiting',
      player1Id,
      player2Id
    };

    this.games.set(roomId, gameState);
    return gameState;
  }

  startPlayerGame(roomId: string, playerId: string): PlayerState | null {
    const gameState = this.games.get(roomId);
    if (!gameState || !gameState.players[playerId]) return null;

    const playerState = gameState.players[playerId];
    
    // If player is already in a game, reset their state
    if (playerState.gameStatus === 'playing' || playerState.gameStatus === 'finished') {
      playerState.revealedIndices = [];
      playerState.guessedWords = [];
      playerState.roundsWon = 0;
      playerState.remainingChances = this.TOTAL_CHANCES;
      playerState.currentRound = 1;
      playerState.usedWords = [];
    }
    
    playerState.gameStatus = 'playing';
    
    // Get first word for the player
    const firstWord = this.getRandomWord(playerState.usedWords);
    playerState.currentWord = firstWord;
    playerState.usedWords.push(firstWord);
    playerState.revealedIndices = this.getInitialRevealedIndices(firstWord, this.INITIAL_REVEALED_LETTERS);

    // Clear any existing interval for this player
    const existingInterval = this.playerIntervals.get(playerId);
    if (existingInterval) {
      clearInterval(existingInterval);
      this.playerIntervals.delete(playerId);
    }

    // Start player's timer
    const interval = setInterval(() => {
      if (playerState.remainingChances <= 0 || playerState.gameStatus === 'finished') {
        clearInterval(interval);
        this.playerIntervals.delete(playerId);
        return;
      }
    }, 1000);

    this.playerIntervals.set(playerId, interval);
    return playerState;
  }

  handlePlayerGuess(roomId: string, playerId: string, guessedWord: string): {
    success: boolean;
    message: string;
    newRound?: boolean;
    newWord?: string;
    remainingChances: number;
    currentRound: number;
  } {
    const gameState = this.games.get(roomId);
    if (!gameState || !gameState.players[playerId]) {
      return { success: false, message: 'Game not found', remainingChances: 0, currentRound: 0 };
    }

    const playerState = gameState.players[playerId];
    if (playerState.remainingChances <= 0) {
      playerState.gameStatus = 'finished';
      return { 
        success: false, 
        message: 'Game over - no more chances remaining', 
        remainingChances: 0,
        currentRound: playerState.currentRound
      };
    }

    const isCorrect = guessedWord.toLowerCase() === playerState.currentWord.toLowerCase();
    playerState.remainingChances--;

    if (isCorrect) {
      playerState.roundsWon++;
      playerState.currentRound++;
      
      if (playerState.currentRound > 5) {
        playerState.gameStatus = 'finished';
        return {
          success: true,
          message: 'Congratulations! You completed all rounds!',
          remainingChances: playerState.remainingChances,
          currentRound: playerState.currentRound
        };
      }

      // Get new word for next round
      const newWord = this.getRandomWord(playerState.usedWords);
      playerState.currentWord = newWord;
      playerState.usedWords.push(newWord);
      playerState.revealedIndices = this.getInitialRevealedIndices(newWord, this.INITIAL_REVEALED_LETTERS);

      return {
        success: true,
        message: 'Correct! Moving to next round',
        newRound: true,
        newWord,
        remainingChances: playerState.remainingChances,
        currentRound: playerState.currentRound
      };
    } else {
      if (playerState.remainingChances <= 0) {
        playerState.gameStatus = 'finished';
        return {
          success: false,
          message: 'Game over - no more chances remaining',
          remainingChances: 0,
          currentRound: playerState.currentRound
        };
      }

      return {
        success: false,
        message: `Incorrect guess. ${playerState.remainingChances} chances remaining`,
        remainingChances: playerState.remainingChances,
        currentRound: playerState.currentRound
      };
    }
  }

  endPlayerGame(roomId: string, playerId: string): void {
    const interval = this.playerIntervals.get(playerId);
    if (interval) {
      clearInterval(interval);
      this.playerIntervals.delete(playerId);
    }

    const gameState = this.games.get(roomId);
    if (gameState && gameState.players[playerId]) {
      gameState.players[playerId].gameStatus = 'finished';
    }
  }

  getGame(roomId: string): GameState | null {
    return this.games.get(roomId) || null;
  }

  cleanupGame(roomId: string): void {
    if (this.playerIntervals.has(roomId)) {
      clearInterval(this.playerIntervals.get(roomId));
      this.playerIntervals.delete(roomId);
    }
    this.games.delete(roomId);
  }

  checkMatchCompletion(roomId: string): { isComplete: boolean; winner?: string } {
    const gameState = this.games.get(roomId);
    if (!gameState) {
      return { isComplete: false };
    }

    // Add your match completion logic here
    // For example:
    if (gameState.currentRound >= gameState.maxRounds) {
      const winner = this.determineWinner(gameState);
      return { isComplete: true, winner };
    }

    return { isComplete: false };
  }

  private determineWinner(gameState: any) {
    // Add your winner determination logic here
    return gameState.players.reduce((winner: string, player: any) => {
      // Compare scores or other winning conditions
      return winner;
    }, '');
  }
}*/

// src/game/game.service.ts (FINAL)

// src/game/game.service.ts (FINAL CORRECTED VERSION)

import { Injectable, Logger } from '@nestjs/common';
import { PlayerService } from '../player/player.service';
import { MatchService } from '../match/match.service';
import { words } from '../data/words';
import { Server } from 'socket.io';

// PlayerState now only holds data unique to that player in a match
interface PlayerState {
  roundsWon: number;
  remainingChances: number;
}

// GameState holds all the shared information for the room
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
  public readonly TOTAL_CHANCES = 5;
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
  
  // --- THIS IS THE NEW CORE FUNCTION FOR ENDING THE MATCH ---
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
    
    this.server.to(roomId).emit('matchOver', results);
    this.cleanupGame(roomId);
  }

  startNextRound(roomId: string, reason: string = 'New round starting!') {
    const gameState = this.games.get(roomId);
    if (!gameState || !this.server) return;
    
    if (this.roundTimers.has(roomId)) {
      clearInterval(this.roundTimers.get(roomId)!);
      this.roundTimers.delete(roomId);
    }
    
    // Check if the match should end BEFORE starting a new round
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
    
    // Get the player's ID from the socket's authentication data
    const playerId = this.server.sockets.sockets.get(socketId)?.handshake.auth.playerId;
    if (!playerId) {
        this.logger.error(`Could not find playerId for socket ${socketId}`);
        return;
    }

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
    this.logger.log(`Cleaned up game for room ${roomId}`);
  }

  // --- No change to these helper methods ---
  private getRandomWord(usedWords: string[] = []): string {
    const availableWords = words.filter(word => !usedWords.includes(word));
    if (availableWords.length === 0) {
      throw new Error('No more unique words available');
    }
    const randomIndex = Math.floor(Math.random() * availableWords.length);
    return availableWords[randomIndex];
  }

  private getInitialRevealedIndices(word: string, count: number): number[] {
    const indices = Array.from({ length: word.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, count);
  }
}