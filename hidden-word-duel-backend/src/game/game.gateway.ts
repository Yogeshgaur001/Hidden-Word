
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
  async handleGuessWord(
    @MessageBody() data: { roomId:string; playerId: string; word: string },
    @ConnectedSocket() client: Socket // Get the client's socket
  ){
    // We pass the unique socket ID (client.id) to the service so it can
    // send private messages (like "Incorrect guess") only to the player who guessed.
    try {
      await this.gameService.handlePlayerGuess(data.roomId, client.id, data.word);
    } catch (error) {
      this.logger.error(`Error handling player guess:`, error);
    }
  }
}