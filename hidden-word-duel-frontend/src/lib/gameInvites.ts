
import { Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from './socket';

export const setupInviteHandlers = (
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
  setWaitingForResponse: (id: string | null) => void,
  onInviteSuccess: (roomId: string) => void
) => {
  // Handle receiving game invite
  socket.on('gameInvite', (data) => {
    console.log('Received game invite from:', data.inviterUsername);
    
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
    }, 100);
  });

  // Handle successful invite
  socket.on('inviteSuccess', (data) => {
    console.log('Invite successful:', data);
    setWaitingForResponse(null);
    alert(data.message);
    onInviteSuccess(data.roomId);
  });

  // Handle declined invite
  socket.on('inviteDeclined', (data) => {
    console.log('Invite declined');
    setWaitingForResponse(null);
    alert('Player declined your invitation');
  });

  // Handle failed invite
  socket.on('inviteFailed', (data) => {
    console.log('Invite failed:', data.message);
    setWaitingForResponse(null);
    alert(data.message);
  });
};

export const sendInvite = (
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
  inviteeId: string,
  setWaitingForResponse: (id: string) => void
) => {
  console.log('Sending invite to player:', inviteeId);
  setWaitingForResponse(inviteeId);
  socket.emit('invitePlayer', { inviteeId });
};