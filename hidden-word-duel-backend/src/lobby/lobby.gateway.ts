// src/lobby/lobby.gateway.ts (IMPROVED)

/*import {
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
    origin: 'http://localhost:3001',
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
      
      // If player was previously in the online list, clean it up
      if (playerId && this.onlinePlayers.has(playerId)) {
        this.onlinePlayers.delete(playerId);
        this.broadcastOnlinePlayers();
      }
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
      this.logger.log(`Player connecting: ${data.username} (${data.id})`);
      
      // Store player data
      const player: OnlinePlayer = {
        id: data.id,
        username: data.username
      };
      
      this.onlinePlayers.set(data.id, player);
      this.logger.log(`Player data stored: ${JSON.stringify(player)}`);
      
      // Broadcast updated player list to all clients
      this.broadcastOnlinePlayers();
      
      // Send current online players to the newly connected player
      const onlinePlayersList = Array.from(this.onlinePlayers.values())
        .filter(p => p.id !== data.id);
      client.emit('updateOnlinePlayers', onlinePlayersList);
      
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
    this.logger.log(`Broadcasting online players: ${JSON.stringify(players)}`);
    this.server.emit('updateOnlinePlayers', players);
  }

  private findSocketByPlayerId(playerId: string): Socket | undefined {
    return Array.from(this.server.sockets.sockets.values())
      .find(socket => socket.handshake.auth.playerId === playerId);
  }

  @SubscribeMessage('joinGameRoom')
  async handleJoinGameRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; playerId: string; username: string }
  ) {
    try {
      const playerId = data.playerId;
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
      this.logger.log(`Player ${data.username} joined game room ${data.roomId}`);

      // Update room status to ready when both players are present
      room.status = 'ready';
      this.gameRooms.set(data.roomId, room);

      // Create room data with full player objects
      const roomData: GameRoomData = {
        roomId: room.roomId,
        player1,
        player2,
        status: 'ready',
        initiator: room.player1Id,
        instructions: [
          "Wait for the host to start the game",
          "You'll have 10 seconds per round to guess letters",
          "First player to complete the word wins!"
        ]
      };

      // Emit room data to all players in the room
      this.server.to(data.roomId).emit('roomJoined', {
        room: roomData
      });

      // If both players are in room, notify them game is ready
      const sockets = await this.server.in(data.roomId).allSockets();
      if (sockets.size === 2) {
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
}*/

/*import {
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
import { OnlinePlayer, GameRoom } from '../types/game.types';
import { GameService } from '../game/game.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3001', // Should use ConfigService in production
    credentials: true,
  },
})
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LobbyGateway.name);
  private gameRooms = new Map<string, GameRoom>();
  private onlinePlayers = new Map<string, OnlinePlayer>();

  constructor(private readonly gameService: GameService) {}

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

    const roomData = {
      roomId,
      player1,
      player2,
      status: 'waiting',
      hostId: player1.id,
    };
    
    this.gameRooms.set(roomId, {
        roomId,
        player1Id: player1.id,
        player2Id: player2.id,
        status: 'waiting',
    });

    await client.join(roomId);
    await inviterSocket.join(roomId);

    this.logger.log(`Room ${roomId} created for ${player1.username} and ${player2.username}`);
    this.server.to(roomId).emit('navigateToGame', { roomId, room: roomData });
  }
  
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
}*/

// src/lobby/lobby.gateway.ts (FINAL)

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