export interface OnlinePlayer {
  id: string;
  username: string;
}

export interface GameRoom {
  roomId: string;
  player1Id: string;
  player2Id: string;
  status: 'waiting' | 'ready' | 'playing';
  initiator?: string;
}

export interface GameRoomData {
  roomId: string;
  player1: OnlinePlayer;
  player2: OnlinePlayer;
  status: 'waiting' | 'ready' | 'playing';
  initiator?: string;
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