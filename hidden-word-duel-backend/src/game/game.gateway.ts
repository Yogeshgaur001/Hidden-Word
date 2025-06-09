import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { GameService } from './game.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true
  },
  transports: ['websocket']
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);

  constructor(private readonly gameService: GameService) {}

  async handleConnection(client: Socket) {
    try {
      const playerId = client.handshake.auth.playerId;
      this.logger.log(`Client connected to game: ${client.id} with playerId: ${playerId}`);
    } catch (error) {
      this.logger.error('Error in handleConnection:', error);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      this.logger.log(`Client disconnected from game: ${client.id}`);
    } catch (error) {
      this.logger.error('Error in handleDisconnect:', error);
    }
  }

  @SubscribeMessage('joinGame')
  async handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    try {
      const playerId = client.handshake.auth.playerId;
      const game = this.gameService.getGame(data.roomId);

      if (!game) {
        client.emit('gameError', { message: 'Game not found' });
        return;
      }

      // Join the game room
      await client.join(data.roomId);

      // Send initial game state
      this.server.to(data.roomId).emit('gameState', game);

    } catch (error) {
      this.logger.error('Error joining game:', error);
      client.emit('gameError', { message: 'Failed to join game' });
    }
  }

  @SubscribeMessage('startGame')
  async handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    try {
      const game = this.gameService.startGame(data.roomId);
      
      if (!game) {
        client.emit('gameError', { message: 'Game not found' });
        return;
      }

      // Notify all players in the room that the game has started
      this.server.to(data.roomId).emit('gameStarted', {
        word: '_'.repeat(game.word.length), // Send placeholder for word length
        status: game.status
      });

      // Set up interval for letter reveals (handled by GameService)
      this.server.to(data.roomId).emit('letterRevealed', {
        index: game.revealedIndices[game.revealedIndices.length - 1]
      });

    } catch (error) {
      this.logger.error('Error starting game:', error);
      client.emit('gameError', { message: 'Failed to start game' });
    }
  }

  @SubscribeMessage('submitGuess')
  async handleSubmitGuess(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; guess: string }
  ) {
    try {
      const playerId = client.handshake.auth.playerId;
      const game = this.gameService.submitGuess(data.roomId, playerId, data.guess);

      if (!game) {
        client.emit('gameError', { message: 'Game not found or not active' });
        return;
      }

      // Notify all players about the guess
      this.server.to(data.roomId).emit('guessSubmitted', {
        playerId,
        guess: data.guess
      });

      // If game is finished, notify about the winner
      if (game.status === 'finished') {
        this.server.to(data.roomId).emit('gameEnded', {
          winner: game.winner,
          isDraw: game.isDraw,
          word: game.word
        });
      }

    } catch (error) {
      this.logger.error('Error submitting guess:', error);
      client.emit('gameError', { message: 'Failed to submit guess' });
    }
  }
} 