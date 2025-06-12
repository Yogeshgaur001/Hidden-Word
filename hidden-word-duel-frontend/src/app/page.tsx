// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useSocket } from '@/lib/SocketProvider';
import { OnlinePlayer } from '@/types/game.types';

export default function HomePage() {
  const router = useRouter();
  const { socket, isConnected, connect } = useSocket();
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [waitingForResponse, setWaitingForResponse] = useState<string | null>(null);

  // This effect runs once to establish player identity
  useEffect(() => {
    let pid = localStorage.getItem('playerId');
    let uname = localStorage.getItem('username');

    if (!pid || !uname) {
      pid = uuidv4();
      uname = `Player_${pid.slice(0, 4)}`;
      localStorage.setItem('playerId', pid);
      localStorage.setItem('username', uname);
    }
    
    setCurrentPlayerId(pid);
    setUsername(uname);
    
    // Connect with the established identity if not already connected
    if (!isConnected) {
      connect(pid, uname);
    }
  }, [connect, isConnected]);

  // This effect sets up event listeners and announces connection
  useEffect(() => {
    // Wait until the socket is connected and we have the player's info
    if (!socket || !isConnected || !currentPlayerId || !username) return;

    // --- THIS IS THE FIX FOR THE RACE CONDITION ---
    // Announce connection AFTER listeners are ready to be attached.
    console.log(`Announcing connection for ${username}`);
    socket.emit('playerConnected', { id: currentPlayerId, username });

    // Define listeners
    const onUpdatePlayers = (players: OnlinePlayer[]) => {
      console.log('Received online players update:', players);
      setOnlinePlayers(players.filter(p => p.id !== currentPlayerId));
    };

    const onGameInvite = (data: { inviterId: string; inviterUsername: string }) => {
      if (window.confirm(`${data.inviterUsername} has invited you to a duel!`)) {
        socket.emit('acceptInvite', { inviterId: data.inviterId });
      }
    };

    const onInviteAccepted = (data: { message: string }) => {
      alert(data.message);
      setWaitingForResponse(null);
    };

    const onNavigateToGame = (data: { roomId: string }) => {
      router.push(`/game/${data.roomId}`);
    };

    // Attach listeners
    socket.on('updateOnlinePlayers', onUpdatePlayers);
    socket.on('gameInvite', onGameInvite);
    socket.on('inviteAccepted', onInviteAccepted);
    socket.on('navigateToGame', onNavigateToGame);

    // Cleanup function to remove listeners
    return () => {
      socket.off('updateOnlinePlayers', onUpdatePlayers);
      socket.off('gameInvite', onGameInvite);
      socket.off('inviteAccepted', onInviteAccepted);
      socket.off('navigateToGame', onNavigateToGame);
    };
  }, [socket, isConnected, router, currentPlayerId, username]);

  const handleInvite = (inviteeId: string) => {
    if (!socket) return;
    setWaitingForResponse(inviteeId);
    socket.emit('invitePlayer', { inviteeId });
  };
  
  if (!username) return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">Initializing...</div>

  return (
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-900 text-white">
      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-8">Hidden Word Duel</h1>
        <div className="mb-8">
          <h2 className="text-xl mb-4">Your Profile</h2>
          <div className="bg-gray-800 p-4 rounded-lg">
            <p>Username: {username}</p>
          </div>
        </div>
        <div className="mb-8">
          <h2 className="text-xl mb-4">Online Players</h2>
          {!isConnected ? <p>Connecting...</p> : onlinePlayers.length === 0 ? (
            <p className="text-gray-400">Waiting for other players...</p>
          ) : (
            <div className="grid gap-4">
              {onlinePlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
                  <span>{player.username}</span>
                  <button
                    onClick={() => handleInvite(player.id)}
                    disabled={waitingForResponse === player.id}
                    className="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-400 disabled:opacity-50"
                  >
                    {waitingForResponse === player.id ? 'Waiting...' : 'Challenge'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}