import { Socket } from 'socket.io-client';

interface ServerToClientEvents {
  gameInvite: (data: { inviterId: string; inviterUsername: string }) => void;
  inviteSuccess: (data: { message: string; roomId: string }) => void;
  inviteDeclined: (data: { message: string }) => void;
  inviteFailed: (data: { message: string }) => void;
}

interface ClientToServerEvents {
  invitePlayer: (data: { inviteeId: string }) => void;
  acceptInvite: (data: { inviterId: string }) => void;
  declineInvite: (data: { inviterId: string }) => void;
}

// Track if we've already shown an invite for this session
let activeInvite = false;

export const setupInviteHandlers = (
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
  setWaitingForResponse: (id: string | null) => void,
  onInviteSuccess: (roomId: string) => void
) => {
  // Remove any existing listeners first
  socket.off('gameInvite');
  socket.off('inviteSuccess');
  socket.off('inviteDeclined');
  socket.off('inviteFailed');

  // Handle receiving game invite
  socket.on('gameInvite', (data: { inviterId: string; inviterUsername: string }) => {
    console.log('Received game invite from:', data.inviterUsername);
    
    // Prevent multiple alerts for the same invite
    if (activeInvite) {
      console.log('Already showing an invite dialog');
      return;
    }
    
    activeInvite = true;
    
    // Show confirmation dialog in a setTimeout to ensure it's not blocked
    setTimeout(() => {
      const accept = window.confirm(
        `${data.inviterUsername} has invited you to a duel! Do you accept?`
      );
      
      if (accept) {
        console.log('Accepting invite from:', data.inviterId);
        socket.emit('acceptInvite', { inviterId: data.inviterId });
      } else {
        console.log('Declining invite from:', data.inviterId);
        socket.emit('declineInvite', { inviterId: data.inviterId });
      }
      activeInvite = false;
    }, 100);
  });

  // Handle successful invite
  socket.on('inviteSuccess', (data: { message: string; roomId: string }) => {
    console.log('Invite successful:', data);
    setWaitingForResponse(null);
    activeInvite = false;
    onInviteSuccess(data.roomId);
  });

  // Handle declined invite
  socket.on('inviteDeclined', (data: { message: string }) => {
    console.log('Invite declined');
    setWaitingForResponse(null);
    activeInvite = false;
    alert('Player declined your invitation');
  });

  // Handle failed invite
  socket.on('inviteFailed', (data: { message: string }) => {
    console.log('Invite failed:', data.message);
    setWaitingForResponse(null);
    activeInvite = false;
    alert(data.message);
  });
};

export const sendInvite = (
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
  inviteeId: string,
  setWaitingForResponse: (id: string) => void
) => {
  if (activeInvite) {
    console.log('An invite is already active');
    return;
  }
  console.log('Sending invite to player:', inviteeId);
  setWaitingForResponse(inviteeId);
  activeInvite = true;
  socket.emit('invitePlayer', { inviteeId });
};