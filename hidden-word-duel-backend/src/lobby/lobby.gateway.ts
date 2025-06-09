// src/lobby/lobby.gateway.ts (IMPROVED)

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
import { 
  OnlinePlayer, 
  GameRoom, 
  GameRoomData,
  PendingInvite 
} from '../types/game.types';
import { GameService } from '../game/game.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true
  },
  transports: ['websocket']
})
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LobbyGateway.name);
  private gameRooms = new Map<string, GameRoom>();
  private onlinePlayers = new Map<string, OnlinePlayer>();
  private pendingInvites = new Map<string, PendingInvite>();

  constructor(private readonly gameService: GameService) {}

  async handleConnection(client: Socket) {
    try {
      const playerId = client.handshake.auth.playerId;
      this.logger.log(`Client connected: ${client.id} with playerId: ${playerId}`);
    } catch (error) {
      this.logger.error('Error in handleConnection:', error);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const playerId = client.handshake.auth.playerId;
      if (playerId) {
        this.onlinePlayers.delete(playerId);
        this.broadcastOnlinePlayers();
        this.logger.log(`Player disconnected: ${playerId}`);
      }
    } catch (error) {
      this.logger.error('Error in handleDisconnect:', error);
    }
  }

  @SubscribeMessage('playerConnected')
  async handlePlayerConnected(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string; username: string }
  ) {
    try {
      // Store player data
      const player: OnlinePlayer = {
        id: data.id,
        username: data.username
      };
      
      this.onlinePlayers.set(data.id, player);
      this.logger.log(`Player data stored: ${JSON.stringify(player)}`);
      
      // Broadcast updated player list
      this.broadcastOnlinePlayers();
      
      return { success: true, message: 'Connected successfully' };
    } catch (error) {
      this.logger.error('Error in playerConnected:', error);
      throw new Error('Failed to connect player');
    }
  }

  @SubscribeMessage('invitePlayer')
  async handleInvitePlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { inviteeId: string }
  ) {
    try {
      const inviterId = client.handshake.auth.playerId;
      const inviterPlayer = this.onlinePlayers.get(inviterId);
      
      if (!inviterPlayer) {
        client.emit('inviteFailed', {
          message: 'Your session is invalid. Please refresh the page.'
        });
        return;
      }

      // Find the socket of invited player
      const inviteeSocket = this.findSocketByPlayerId(data.inviteeId);

      if (!inviteeSocket) {
        client.emit('inviteFailed', {
          message: 'Player is not available or offline'
        });
        return;
      }

      // Store the new invite with username
      const inviteId = uuidv4();
      this.pendingInvites.set(inviteId, {
        inviterId,
        inviterUsername: inviterPlayer.username,
        inviteeId: data.inviteeId
      });

      this.logger.log(`Sending invite from ${inviterPlayer.username} to player ${data.inviteeId}`);
      
      // Send invite to the other player
      inviteeSocket.emit('gameInvite', {
        inviterId,
        inviterUsername: inviterPlayer.username
      });

      // Send confirmation to inviter
      client.emit('inviteSent', {
        message: 'Invite sent successfully',
        inviteeId: data.inviteeId
      });

    } catch (error) {
      this.logger.error('Failed to send invite:', error);
      client.emit('inviteFailed', {
        message: 'Failed to send invite. Please try again.'
      });
    }
  }

  private clearExistingInvites(inviterId: string, inviteeId: string) {
    for (const [key, invite] of this.pendingInvites.entries()) {
      if (invite.inviterId === inviterId || invite.inviteeId === inviteeId) {
        this.pendingInvites.delete(key);
      }
    }
  }

  @SubscribeMessage('acceptInvite')
  async handleAcceptInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { inviterId: string }
  ) {
    try {
      const acceptorId = client.handshake.auth.playerId;
      
      // Get both players' data
      const player1 = this.onlinePlayers.get(data.inviterId);
      const player2 = this.onlinePlayers.get(acceptorId);

      if (!player1 || !player2) {
        this.logger.error(`Player data missing - player1: ${!!player1}, player2: ${!!player2}`);
        client.emit('acceptFailed', {
          message: 'One or both players not found'
        });
        return;
      }

      // Create new room with player IDs
      const roomId = uuidv4();
      const newRoom: GameRoom = {
        roomId,
        player1Id: player1.id,
        player2Id: player2.id,
        status: 'waiting'
      };
      
      this.gameRooms.set(roomId, newRoom);
      this.logger.log(`Room created: ${roomId} with players ${player1.username} and ${player2.username}`);

      // Create game state
      this.gameService.createGame(roomId, player1.id, player2.id);

      // Create room data for frontend with full player objects
      const roomData: GameRoomData = {
        roomId,
        player1,
        player2,
        status: 'waiting'
      };

      // Get inviter's socket and join both players to room
      const inviterSocket = this.findSocketByPlayerId(data.inviterId);
      if (!inviterSocket) {
        client.emit('acceptFailed', {
          message: 'Inviter disconnected'
        });
        return;
      }

      // Join both sockets to the room
      await Promise.all([
        client.join(roomId),
        inviterSocket.join(roomId)
      ]);

      // Notify both players with room data
      this.server.to(roomId).emit('inviteSuccess', {
        message: 'Game room created!',
        roomId,
        room: roomData
      });

      // Set room status to ready since both players are here
      newRoom.status = 'ready';
      this.gameRooms.set(roomId, newRoom);
      roomData.status = 'ready';

      // Notify room is ready
      this.server.to(roomId).emit('gameReady', {
        room: roomData
      });

    } catch (error) {
      this.logger.error('Error accepting invite:', error);
      client.emit('acceptFailed', {
        message: 'Failed to accept invite'
      });
    }
  }

  @SubscribeMessage('declineInvite')
  handleDeclineInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { inviterId: string }
  ) {
    try {
      const inviterSocket = this.findSocketByPlayerId(data.inviterId);
      if (inviterSocket) {
        inviterSocket.emit('inviteDeclined', {
          message: 'Player declined your invitation'
        });
        this.logger.log(`Invite from ${data.inviterId} was declined`);
      }
    } catch (error) {
      this.logger.error('Error declining invite:', error);
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    try {
      const playerId = client.handshake.auth.playerId;
      const room = this.gameRooms.get(data.roomId);

      if (!room) {
        client.emit('roomError', { message: 'Room not found' });
        return;
      }

      // Compare player ID with stored string IDs
      if (room.player1Id !== playerId && room.player2Id !== playerId) {
        client.emit('roomError', { message: 'Not authorized to join this room' });
        return;
      }

      // Join the socket to the room
      await client.join(data.roomId);

      // Get both players' information using the stored IDs
      const player1 = this.onlinePlayers.get(room.player1Id);
      const player2 = this.onlinePlayers.get(room.player2Id);

      // Send room information to all players in the room
      this.server.to(data.roomId).emit('roomPlayers', {
        players: [player1, player2].filter(Boolean)
      });

      this.logger.log(`Player ${playerId} joined room ${data.roomId}`);

      // Check if both players are in the room
      const sockets = await this.server.in(data.roomId).allSockets();
      if (sockets.size === 2) {
        this.server.to(data.roomId).emit('gameReady', {
          message: 'Both players connected! Game starting...'
        });
      }
    } catch (error) {
      this.logger.error('Error joining room:', error);
      client.emit('roomError', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    try {
      await client.leave(data.roomId);
      const playerId = client.handshake.auth.playerId;
      this.logger.log(`Player ${playerId} left room ${data.roomId}`);
    } catch (error) {
      this.logger.error('Error leaving room:', error);
    }
  }

  private broadcastOnlinePlayers() {
    const players = Array.from(this.onlinePlayers.values());
    this.server.emit('updateOnlinePlayers', players);
  }

  private findSocketByPlayerId(playerId: string): Socket | undefined {
    return Array.from(this.server.sockets.sockets.values())
      .find(socket => socket.handshake.auth.playerId === playerId);
  }

  @SubscribeMessage('joinGameRoom')
  async handleJoinGameRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    try {
      const playerId = client.handshake.auth.playerId;
      const room = this.gameRooms.get(data.roomId);

      if (!room) {
        client.emit('roomError', { message: 'Room not found' });
        return;
      }

      // Get player data using IDs stored in room
      const player1 = this.onlinePlayers.get(room.player1Id);
      const player2 = this.onlinePlayers.get(room.player2Id);

      if (!player1 || !player2) {
        client.emit('roomError', { message: 'Player data incomplete' });
        return;
      }

      // Join socket room
      await client.join(data.roomId);

      // Create room data with full player objects
      const roomData: GameRoomData = {
        roomId: room.roomId,
        player1,
        player2,
        status: room.status
      };

      // Emit room data
      this.server.to(data.roomId).emit('roomJoined', {
        room: roomData
      });

      // Check if both players are in room
      const sockets = await this.server.in(data.roomId).allSockets();
      if (sockets.size === 2) {
        room.status = 'ready';
        this.gameRooms.set(data.roomId, room);
        roomData.status = 'ready';
        
        // Notify players game is ready
        this.server.to(data.roomId).emit('gameReady', {
          room: roomData
        });
      }

    } catch (error) {
      this.logger.error('Error joining game room:', error);
      client.emit('roomError', { message: 'Failed to join room' });
    }
  }

  // Update the isPlayerInRoom helper method
  private isPlayerInRoom(playerId: string, room: GameRoom): boolean {
    return room.player1Id === playerId || room.player2Id === playerId;
  }

  private async arePlayersConnected(roomId: string): Promise<boolean> {
    const sockets = await this.server.in(roomId).allSockets();
    return sockets.size === 2;
  }
}