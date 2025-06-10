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
  private logger = new Logger('GameGateway');
  @WebSocketServer() private server: Server;

  constructor(
    private readonly gameService: GameService
  ) {}

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

      // If game is already in playing state, send gameStarted event to all players
      if (game.status === 'playing') {
        this.server.to(data.roomId).emit('gameStarted', game);
      }

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
      // Get all sockets in the room
      const sockets = await this.server.in(data.roomId).allSockets();
      
      if (sockets.size < 2) {
        client.emit('gameError', { message: 'Waiting for other player to join' });
        return;
      }

      const game = this.gameService.startGame(data.roomId);
      
      if (!game) {
        client.emit('gameError', { message: 'Game not found' });
        return;
      }

      // Notify all players in the room that the game has started
      this.server.to(data.roomId).emit('gameStarted', game);

      // Start sending round updates
      const interval = setInterval(() => {
        const game = this.gameService.getGame(data.roomId);
        if (!game || game.status !== 'playing') {
          clearInterval(interval);
          return;
        }

        const now = Date.now();
        const roundElapsed = now - game.roundStartTime;
        const remainingTime = Math.max(0, 10000 - roundElapsed);

        this.server.to(data.roomId).emit('roundUpdate', {
          remainingTime,
          currentRound: game.currentRound,
          remainingRounds: game.remainingRounds
        });

        if (remainingTime === 0) {
          // Time's up for this round
          const updatedGame = this.gameService.getGame(data.roomId);
          if (updatedGame && updatedGame.status === 'playing') {
            updatedGame.remainingRounds--;
            if (updatedGame.remainingRounds <= 0) {
              this.gameService.endGame(data.roomId);
              this.server.to(data.roomId).emit('gameEnded', updatedGame);
            } else {
              updatedGame.currentRound++;
              updatedGame.roundStartTime = Date.now();
              this.server.to(data.roomId).emit('roundUpdate', {
                remainingTime: 10000,
                currentRound: updatedGame.currentRound,
                remainingRounds: updatedGame.remainingRounds
              });
            }
          }
        }
      }, 1000);

    } catch (error) {
      this.logger.error('Error starting game:', error);
      client.emit('gameError', { message: 'Failed to start game' });
    }
  }

  @SubscribeMessage('guessWord')
  async handleGuessWord(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; word: string }
  ) {
    try {
      const playerId = client.handshake.auth.playerId;
      const game = this.gameService.guessWord(data.roomId, playerId, data.word);

      if (!game) {
        client.emit('gameError', { message: 'Failed to process guess' });
        return;
      }

      const playerState = game.players[playerId];
      const lastGuess = playerState.guessedWords[playerState.guessedWords.length - 1];

      // Notify all players about the guess
      this.server.to(data.roomId).emit('wordGuessed', {
        playerId,
        word: lastGuess.word,
        correct: lastGuess.correct
      });

      // If game ended, notify all players
      if (game.status === 'finished') {
        this.server.to(data.roomId).emit('gameEnded', game);
      }

    } catch (error) {
      this.logger.error('Error processing guess:', error);
      client.emit('gameError', { message: 'Failed to process guess' });
    }
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
} 