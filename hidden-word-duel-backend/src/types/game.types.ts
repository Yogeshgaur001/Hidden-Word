// src/types/game.types.ts (FINAL)

export interface OnlinePlayer {
  id: string;
  username: string;
}

export interface GameRoom {
  roomId: string;
  player1Id: string;
  player2Id: string;
  status: 'waiting' | 'ready' | 'playing';
  hostId: string; // The old 'initiator' is replaced by hostId for consistency
}

export interface GameRoomData {
  roomId: string;
  player1: OnlinePlayer;
  player2: OnlinePlayer;
  status: 'waiting' | 'ready' | 'playing';
  hostId: string; // <-- THIS IS THE FIX. We are adding the required property.
  instructions?: string[];
}

export interface PendingInvite {
  inviterId: string;
  inviterUsername: string;
  inviteeId: string;
}

export interface GameRoles {
  [playerId: string]: 'wordCreator' | 'wordGuesser';
}