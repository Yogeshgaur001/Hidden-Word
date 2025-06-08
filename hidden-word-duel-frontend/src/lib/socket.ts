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
  if (socket) {
    return socket;
  }

  socket = io('http://localhost:3000', {
    auth: { playerId },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('Connected to server');
    socket?.emit('playerConnected', { id: playerId });
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;