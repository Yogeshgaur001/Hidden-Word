import { io, Socket } from 'socket.io-client';

export interface OnlinePlayer {
  id: string;
  username: string;
}

interface ServerToClientEvents {
  updateOnlinePlayers: (players: OnlinePlayer[]) => void;
  gameInvite: (data: { inviterId: string; inviterUsername: string }) => void;
  inviteSuccess: (data: { message: string; roomId: string }) => void;
  inviteFailed: (data: { message: string }) => void;
  inviteDeclined: (data: { message: string }) => void;
  roomPlayers: (data: { players: OnlinePlayer[] }) => void;
  gameReady: (data: { message: string }) => void;
  roomError: (data: { message: string }) => void;
}

interface ClientToServerEvents {
  playerConnected: (data: { id: string; username: string }) => void;
  invitePlayer: (data: { inviteeId: string }) => void;
  acceptInvite: (data: { inviterId: string }) => void;
  declineInvite: (data: { inviterId: string }) => void;
  joinRoom: (data: { roomId: string }) => void;
  leaveRoom: (data: { roomId: string }) => void;
}

let socket: Socket | null = null;

export const createSocket = (playerId: string): Socket => {
  if (socket?.connected) {
    console.log('Reusing existing socket connection');
    return socket;
  }

  if (socket) {
    console.log('Disconnecting existing socket');
    socket.disconnect();
  }

  console.log('Creating new socket connection...');
  socket = io('http://localhost:3000', {
    auth: { playerId },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully');
    // Always send player data on connect/reconnect
    const username = `Player_${playerId.slice(0, 4)}`;
    socket?.emit('playerConnected', { id: playerId, username });
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    // Attempt to reconnect on disconnect unless it was intentional
    if (reason === 'io server disconnect' || reason === 'transport close') {
      console.log('Attempting to reconnect...');
      socket?.connect();
    }
  });

  socket.on('updateOnlinePlayers', (players: OnlinePlayer[]) => {
    console.log('Received online players:', players);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;