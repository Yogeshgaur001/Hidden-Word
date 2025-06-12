/*import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);

  constructor(private readonly gameService: GameService) {}

  @SubscribeMessage('joinGameRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string; username: string }
  ) {
    try {
      await client.join(data.roomId);
      this.logger.log(`Player ${data.playerId} (${data.username}) joined room ${data.roomId}`);
      
      // Get or create game state
      let gameState = this.gameService.getGameState(data.roomId);
      
      if (!gameState) {
        // Create new game state with this player as player1
        gameState = await this.gameService.createGame(data.roomId, data.playerId, data.playerId);
      } else {
        // Add player2 if slot is available
        if (!gameState.player2Id && gameState.player1Id !== data.playerId) {
          gameState.player2Id = data.playerId;
          gameState.players[data.playerId] = {
            revealedIndices: [],
            guessedWords: [],
            roundsWon: 0,
            remainingChances: this.gameService.TOTAL_CHANCES,
            currentRound: 1,
            currentWord: '',
            usedWords: [],
            gameStatus: 'waiting'
          };
        }
      }
      
      client.emit('roomJoined', {
        roomId: data.roomId,
        playerId: data.playerId,
        message: 'Successfully joined room',
        room: {
          roomId: gameState.roomId,
          status: gameState.status,
          player1: {
            id: gameState.player1Id,
            username: data.username
          },
          player2: gameState.player2Id ? {
            id: gameState.player2Id,
            username: data.username
          } : null
        }
      });
    } catch (error) {
      this.logger.error('Error in joinRoom:', error);
      client.emit('roomError', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('startGame')
  async handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string }
  ) {
    try {
      this.logger.log(`Player ${data.playerId} starting game in room ${data.roomId}`);
      
      // First, check if game state exists
      let gameState = this.gameService.getGameState(data.roomId);
      
      // If no game state exists, create one
      if (!gameState) {
        gameState = await this.gameService.createGame(data.roomId, data.playerId, data.playerId);
      }
      
      // Now start the player's game
      const playerState = this.gameService.startPlayerGame(data.roomId, data.playerId);
      if (!playerState) {
        throw new Error('Failed to start player game');
      }

      // Send initial game state to the player
      client.emit('gameStarted', {
        currentRound: playerState.currentRound,
        word: playerState.currentWord,
        revealedIndices: playerState.revealedIndices,
        remainingChances: playerState.remainingChances,
        message: 'Game started! You have 5 chances to complete all rounds.'
      });

    } catch (error) {
      this.logger.error('Error in startGame:', error);
      client.emit('gameError', { message: 'Failed to start game' });
    }
  }

  @SubscribeMessage('guessWord')
  async handleGuessWord(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string; word: string }
  ) {
    try {
      const result = this.gameService.handlePlayerGuess(data.roomId, data.playerId, data.word);
      
      if (result.newRound) {
        // Player guessed correctly, moving to next round
        client.emit('roundStart', {
          currentRound: result.currentRound,
          word: result.newWord,
          remainingChances: result.remainingChances,
          message: result.message
        });
      } else {
        // Send guess result
        client.emit('wordGuessed', {
          success: result.success,
          message: result.message,
          remainingChances: result.remainingChances,
          currentRound: result.currentRound
        });

        if (result.remainingChances <= 0) {
          // Game over due to no more chances
          client.emit('gameOver', {
            reason: 'No more chances remaining',
            roundsCompleted: result.currentRound - 1
          });
          this.gameService.endPlayerGame(data.roomId, data.playerId);
        }
      }
    } catch (error) {
      this.logger.error('Error in guessWord:', error);
      client.emit('gameError', { message: 'Failed to process guess' });
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string }
  ) {
    try {
      await client.leave(data.roomId);
      this.logger.log(`Player ${data.playerId} left room ${data.roomId}`);
      
      // End the player's game
      this.gameService.endPlayerGame(data.roomId, data.playerId);
      
      client.emit('roomLeft', {
        roomId: data.roomId,
        message: 'Successfully left room'
      });
    } catch (error) {
      this.logger.error('Error in leaveRoom:', error);
      client.emit('roomError', { message: 'Failed to leave room' });
    }
  }
} */

// src/game/game.gateway.ts (FINAL)

/*import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3001', // Should use ConfigService in production
    credentials: true,
  },
})
export class GameGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);
  private readyPlayers = new Map<string, Set<string>>(); // Map<roomId, Set<playerId>>

  constructor(
      private readonly gameService: GameService,
      private readonly configService: ConfigService
  ) {}

  @SubscribeMessage('playerReady')
  async handlePlayerReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string },
  ) {
    const { roomId, playerId } = data;
    const gameState = this.gameService.getGameState(roomId);

    if (!gameState) {
      client.emit('gameError', { message: 'Game room not found.' });
      return;
    }
    
    // Ensure the socket is in the room (it should be from the lobby)
    client.join(roomId);

    if (!this.readyPlayers.has(roomId)) {
      this.readyPlayers.set(roomId, new Set());
    }
    this.readyPlayers.get(roomId)!.add(playerId);
    this.logger.log(`Player ${playerId} is ready in room ${roomId}. Total ready: ${this.readyPlayers.get(roomId)!.size}`);
    
    // If both players are ready, notify the clients.
    if (this.readyPlayers.get(roomId)!.size === 2) {
      this.logger.log(`Both players ready in room ${roomId}. Notifying clients.`);
      this.server.to(roomId).emit('allPlayersReady', {
        message: 'Both players are ready. The host can start.',
        hostId: gameState.player1Id,
      });
    }
  }

  @SubscribeMessage('startGame')
  async handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string },
  ) {
    try {
      const gameState = this.gameService.getGameState(data.roomId);
      if (!gameState) {
        throw new Error('Game state not found.');
      }

      // Security Check: Only the host (player1) can start the game.
      if (gameState.player1Id !== data.playerId) {
        client.emit('gameError', { message: 'Only the host can start the game.' });
        return;
      }

      // Start the game for BOTH players
      const player1State = this.gameService.startPlayerGame(data.roomId, gameState.player1Id);
      const player2State = this.gameService.startPlayerGame(data.roomId, gameState.player2Id);

      gameState.status = 'playing';

      const sockets = await this.server.in(data.roomId).fetchSockets();
      for (const socket of sockets) {
        const pId = socket.handshake.auth.playerId;
        const state = pId === gameState.player1Id ? player1State : player2State;
        
        if (state) {
          socket.emit('gameStarted', {
            currentRound: state.currentRound,
            word: state.currentWord,
            revealedIndices: state.revealedIndices,
            remainingChances: state.remainingChances,
            message: `Game started! You have ${this.gameService.TOTAL_CHANCES} chances.`,
          });
        }
      }
      this.logger.log(`Game started in room ${data.roomId} by ${data.playerId}`);

    } catch (error) {
      this.logger.error('Error in startGame:', error);
      client.emit('gameError', { message: 'Failed to start game' });
    }
  }

  @SubscribeMessage('guessWord')
  async handleGuessWord(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string; word: string },
  ) {
    try {
      const result = this.gameService.handlePlayerGuess(data.roomId, data.playerId, data.word);

      // Handle correct guess
      if (result.newRound) {
        client.emit('roundStart', {
          currentRound: result.currentRound,
          newWord: result.newWord,
          revealedIndices: result.revealedIndices,
          remainingChances: result.remainingChances,
          message: result.message,
        });
      } else {
        // Handle incorrect guess
        client.emit('wordGuessed', {
          success: result.success,
          message: result.message,
          remainingChances: result.remainingChances,
          currentRound: result.currentRound,
        });
      }

      // Handle game over for this player
      if (result.gameOver) {
        client.emit('gameOver', {
          reason: result.message,
          roundsCompleted: result.currentRound - 1,
        });
        
        // Check if this ends the whole match
        const matchResult = this.gameService.checkMatchCompletion(data.roomId);
        if (matchResult && matchResult.isMatchOver) {
            this.server.to(data.roomId).emit('matchOver', matchResult);
            this.gameService.cleanupGame(data.roomId);
            this.readyPlayers.delete(data.roomId);
        }
      }
    } catch (error) {
      this.logger.error('Error in guessWord:', error);
      client.emit('gameError', { message: 'Failed to process guess' });
    }
  }

  @SubscribeMessage('makeGuess')
  async handleGuess(@MessageBody() data: any): Promise<void> {
    const result = await this.gameService.processGuess(data);
    
    this.server.to(data.roomId).emit('guessResult', {
      success: result.success,
      message: result.message,
      newRound: result.newRound,
      newWord: result.newWord,
      remainingChances: result.remainingChances,
      currentRound: result.currentRound,
      revealedIndices: result.revealedIndices || [],  // Provide default empty array
    });

    if (result.gameOver) {
      const matchResult = this.gameService.checkMatchCompletion(data.roomId);
      if (matchResult.isComplete) {
        this.server.to(data.roomId).emit('matchComplete', {
          winner: matchResult.winner
        });
      }
    }
  }
  
  // No changes needed for GameService, so it is omitted for brevity.
}*/


// src/game/game.service.ts (FINAL)

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
  remainingChances: number;
  currentRound: number;
  currentWord: string;
  usedWords: string[];
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

// Define a clear return type for guess results
interface GuessResult {
  success: boolean;
  message: string;
  remainingChances: number;
  currentRound: number;
  newRound?: boolean;
  newWord?: string;
  revealedIndices?: number[];
  gameOver?: boolean;
}

@Injectable()
export class GameService {
  public readonly TOTAL_CHANCES = 6; // Set a clear constant
  public readonly TOTAL_ROUNDS = 5;  // Set a clear constant
  private readonly INITIAL_REVEALED_LETTERS = 2;
  private readonly games = new Map<string, GameState>();

  constructor(
    private readonly playerService: PlayerService,
    private readonly matchService: MatchService,
  ) {}

  getGameState(roomId: string): GameState | null {
    return this.games.get(roomId) || null;
  }

  getRandomWord(usedWords: string[] = []): string {
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

  async createGame(roomId: string, player1Id: string, player2Id: string): Promise<GameState> {
    const player1 = await this.playerService.findOrCreate(player1Id);
    const player2 = await this.playerService.findOrCreate(player2Id);

    const gameState: GameState = {
      roomId,
      players: {
        [player1Id]: { revealedIndices: [], guessedWords: [], roundsWon: 0, remainingChances: this.TOTAL_CHANCES, currentRound: 1, currentWord: '', usedWords: [], gameStatus: 'waiting' },
        [player2Id]: { revealedIndices: [], guessedWords: [], roundsWon: 0, remainingChances: this.TOTAL_CHANCES, currentRound: 1, currentWord: '', usedWords: [], gameStatus: 'waiting' },
      },
      status: 'waiting',
      player1Id,
      player2Id,
    };

    this.games.set(roomId, gameState);
    return gameState;
  }

  startPlayerGame(roomId: string, playerId: string): PlayerState | null {
    const gameState = this.games.get(roomId);
    if (!gameState || !gameState.players[playerId]) return null;

    const playerState = gameState.players[playerId];
    playerState.gameStatus = 'playing';

    const firstWord = this.getRandomWord(playerState.usedWords);
    playerState.currentWord = firstWord;
    playerState.usedWords.push(firstWord);
    playerState.revealedIndices = this.getInitialRevealedIndices(firstWord, this.INITIAL_REVEALED_LETTERS);

    return playerState;
  }

  handlePlayerGuess(roomId: string, playerId: string, guessedWord: string): GuessResult {
    const gameState = this.games.get(roomId);
    const playerState = gameState?.players[playerId];

    if (!gameState || !playerState) {
      throw new Error('Game or player not found.');
    }

    if (playerState.gameStatus === 'finished') {
      return { success: false, message: 'Your game is already over.', remainingChances: 0, currentRound: playerState.currentRound, gameOver: true };
    }

    const isCorrect = guessedWord.toLowerCase() === playerState.currentWord.toLowerCase();
    
    if (isCorrect) {
      playerState.roundsWon++;
      playerState.currentRound++;
      
      // Check if player won the whole game
      if (playerState.currentRound > this.TOTAL_ROUNDS) {
        playerState.gameStatus = 'finished';
        return {
          success: true,
          message: 'Congratulations! You completed all rounds!',
          remainingChances: playerState.remainingChances,
          currentRound: playerState.currentRound,
          gameOver: true,
        };
      }

      // If not, start the next round
      const newWord = this.getRandomWord(playerState.usedWords);
      playerState.currentWord = newWord;
      playerState.usedWords.push(newWord);
      playerState.revealedIndices = this.getInitialRevealedIndices(newWord, this.INITIAL_REVEALED_LETTERS);

      return {
        success: true,
        message: 'Correct! Moving to the next round.',
        newRound: true,
        newWord,
        revealedIndices: playerState.revealedIndices,
        remainingChances: playerState.remainingChances,
        currentRound: playerState.currentRound,
        gameOver: false,
      };

    } else {
      // Incorrect guess
      playerState.remainingChances--;

      if (playerState.remainingChances <= 0) {
        playerState.gameStatus = 'finished';
        return {
          success: false,
          message: 'Incorrect. You have no chances left. Game over!',
          remainingChances: 0,
          currentRound: playerState.currentRound,
          gameOver: true,
        };
      }

      return {
        success: false,
        message: `Incorrect guess. ${playerState.remainingChances} chances remaining.`,
        remainingChances: playerState.remainingChances,
        currentRound: playerState.currentRound,
        gameOver: false,
      };
    }
  }

  checkMatchCompletion(roomId: string) {
    const gameState = this.games.get(roomId);
    if (!gameState) return null;

    const player1 = gameState.players[gameState.player1Id];
    const player2 = gameState.players[gameState.player2Id];

    if (player1.gameStatus === 'finished' && player2.gameStatus === 'finished') {
      gameState.status = 'finished';
      let winnerId: string | null = null;
      if (player1.roundsWon > player2.roundsWon) winnerId = gameState.player1Id;
      if (player2.roundsWon > player1.roundsWon) winnerId = gameState.player2Id;
      
      return {
        isMatchOver: true, // FIX: Use a consistent name
        winnerId: winnerId,
        scores: {
          [gameState.player1Id]: player1.roundsWon,
          [gameState.player2Id]: player2.roundsWon,
        }
      };
    }

    return { isMatchOver: false };
  }

  cleanupGame(roomId: string): void {
    this.games.delete(roomId);
  }
}*/

// src/game/game.gateway.ts (FINAL - WITH EXPORT FIX)

// src/game/game.gateway.ts (FINAL CORRECTED VERSION)

// src/game/game.gateway.ts (FINAL CORRECTED VERSION)

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit, // 1. Import the OnGatewayInit lifecycle hook
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

// The ConfigService is no longer needed in this simplified gateway
// import { ConfigService } from '@nestjs/config';

@WebSocketGateway()
export class GameGateway implements OnGatewayInit { // 2. Implement the hook
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);

  // The constructor is now much simpler
  constructor(private readonly gameService: GameService) {}

  // 3. This lifecycle hook runs once when the gateway starts up.
  // It's the perfect place to give the GameService a reference to the server.
  afterInit(server: Server) {
    this.logger.log('GameGateway Initialized. Passing server to GameService.');
    this.gameService.setServer(server);
  }

  // 4. The 'playerReady' handler is no longer needed here. 
  // The lobby and game room pages handle readiness.

  // 5. The 'startGame' handler is now very simple.
  @SubscribeMessage('startGame')
  handleStartGame(@MessageBody() data: { roomId: string; playerId: string }) {
    this.logger.log(`Received startGame from ${data.playerId} for room ${data.roomId}`);
    // The service now handles all the complex logic of starting the first round.
    this.gameService.startNextRound(data.roomId, 'The game is starting!');
  }

  // 6. The 'guessWord' handler is also much simpler.
  @SubscribeMessage('guessWord')
  handleGuessWord(
    @MessageBody() data: { roomId:string; playerId: string; word: string },
    @ConnectedSocket() client: Socket // Get the client's socket
  ){
    // We pass the unique socket ID (client.id) to the service so it can
    // send private messages (like "Incorrect guess") only to the player who guessed.
    this.gameService.handlePlayerGuess(data.roomId, client.id, data.word);
  }
}