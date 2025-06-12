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
import { v4 as uuidv4 } from 'uuid';
import { OnlinePlayer, GameRoom, GameRoomData } from '../types/game.types'; // Ensure GameRoomData is imported
import { GameService } from '../game/game.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3001',
    credentials: true,
  },
})
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LobbyGateway.name);
  private gameRooms = new Map<string, GameRoomData>(); // Store the full room data
  private onlinePlayers = new Map<string, OnlinePlayer>();

  constructor(private readonly gameService: GameService) {}

  // --- No changes to handleConnection, handleDisconnect, playerConnected, invitePlayer ---

  async handleConnection(client: Socket) {
    const playerId = client.handshake.auth.playerId;
    this.logger.log(`Client connected: ${client.id} with playerId: ${playerId}`);
  }

  async handleDisconnect(client: Socket) {
    const playerId = client.handshake.auth.playerId;
    if (playerId) {
      this.onlinePlayers.delete(playerId);
      this.broadcastOnlinePlayers();
      this.logger.log(`Player disconnected: ${playerId}`);
    }
  }

  @SubscribeMessage('playerConnected')
  async handlePlayerConnected(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string; username: string },
  ) {
    const player: OnlinePlayer = { id: data.id, username: data.username };
    this.onlinePlayers.set(data.id, player);
    this.broadcastOnlinePlayers();
  }

  @SubscribeMessage('invitePlayer')
  async handleInvitePlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { inviteeId: string },
  ) {
    const inviterId = client.handshake.auth.playerId;
    const inviter = this.onlinePlayers.get(inviterId);
    const inviteeSocket = this.findSocketByPlayerId(data.inviteeId);

    if (!inviter || !inviteeSocket) {
      client.emit('inviteFailed', { message: 'Player is not available.' });
      return;
    }

    inviteeSocket.emit('gameInvite', {
      inviterId,
      inviterUsername: inviter.username,
    });

    client.emit('inviteSent', { inviteeId: data.inviteeId });
  }
  
  // --- handleAcceptInvite is the key change ---
  @SubscribeMessage('acceptInvite')
  async handleAcceptInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { inviterId: string },
  ) {
    const acceptorId = client.handshake.auth.playerId;
    const inviterSocket = this.findSocketByPlayerId(data.inviterId);
    const player1 = this.onlinePlayers.get(data.inviterId); // Inviter
    const player2 = this.onlinePlayers.get(acceptorId); // Acceptor

    if (!inviterSocket || !player1 || !player2) {
      client.emit('acceptFailed', { message: 'One or both players are disconnected.' });
      return;
    }

    const roomId = uuidv4();
    await this.gameService.createGame(roomId, player1.id, player2.id);

    const roomData: GameRoomData = {
      roomId,
      player1,
      player2,
      status: 'waiting',
      hostId: player1.id,
    };
    
    this.gameRooms.set(roomId, roomData); // Store the full data object

    await client.join(roomId);
    await inviterSocket.join(roomId);

    // 1. Notify the host that the invite was accepted (YOUR REQUESTED FEATURE)
    inviterSocket.emit('inviteAccepted', {
      message: `${player2.username} has accepted your challenge!`,
    });

    // 2. Give both players a brief moment before navigating them
    setTimeout(() => {
        this.server.to(roomId).emit('navigateToGame', { roomId });
    }, 1500); // 1.5 second delay

    this.logger.log(`Room ${roomId} created for ${player1.username} and ${player2.username}`);
  }

  // --- NEW HANDLER ---
  @SubscribeMessage('getRoomData')
  handleGetRoomData(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const roomData = this.gameRooms.get(data.roomId);
    if (roomData) {
      // Send the data only to the client who asked for it
      client.emit('roomData', { room: roomData });
    } else {
      client.emit('roomError', { message: 'Could not retrieve room data.' });
    }
  }
  
  // --- No changes to declineInvite, broadcastOnlinePlayers, findSocketByPlayerId ---
  @SubscribeMessage('declineInvite')
  handleDeclineInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { inviterId: string }
  ) {
    const inviterSocket = this.findSocketByPlayerId(data.inviterId);
    if (inviterSocket) {
        inviterSocket.emit('inviteDeclined', { message: 'Your opponent declined.' });
    }
  }

  private broadcastOnlinePlayers() {
    const players = Array.from(this.onlinePlayers.values());
    this.server.emit('updateOnlinePlayers', players);
  }

  private findSocketByPlayerId(playerId: string): Socket | undefined {
    return Array.from(this.server.sockets.sockets.values()).find(
      (socket) => socket.handshake.auth.playerId === playerId,
    );
  }
}