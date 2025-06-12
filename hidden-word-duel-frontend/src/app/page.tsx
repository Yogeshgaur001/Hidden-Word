// src/app/page.tsx
'use client';

/*import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Socket } from 'socket.io-client';
import { createSocket, OnlinePlayer } from '@/lib/socket';
import { api, Player } from '@/lib/api';

// Add a flag to track if an invite dialog is currently showing
let isShowingInvite = false;

// Helper function to send invites
const sendInvite = (
  socket: Socket,
  inviteeId: string,
  setWaitingForResponse: (id: string) => void
) => {
  console.log('Sending invite to player:', inviteeId);
  setWaitingForResponse(inviteeId);
  socket.emit('invitePlayer', { inviteeId });
};

export default function HomePage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [waitingForResponse, setWaitingForResponse] = useState<string | null>(null);

  useEffect(() => {
    const initializePlayer = async () => {
      let playerId = localStorage.getItem('playerId');
      let player: Player | null = null;

      if (playerId) {
        try {
          // Try to get existing player from database
          player = await api.getPlayer(playerId);
        } catch (error) {
          console.error('Error fetching player:', error);
          // If player not found in database, remove from localStorage
          localStorage.removeItem('playerId');
          playerId = null;
        }
      }
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useSocket } from '@/lib/SocketProvider';
import { api, Player } from '@/lib/api';
import { OnlinePlayer } from '@/types/game.types';

export default function HomePage() {
  const router = useRouter();
  const { socket, isConnected, connect } = useSocket(); // Get the new connect function
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [waitingForResponse, setWaitingForResponse] = useState<string | null>(null);

  // This effect handles player creation and socket connection
  useEffect(() => {
    const initializePlayer = async () => {
      let playerId = localStorage.getItem('playerId');
      if (!playerId) {
        // Player does not exist, create a new one
        playerId = uuidv4();
        const player = await api.createPlayer(`Player_${playerId.slice(0, 4)}`, playerId);
        localStorage.setItem('playerId', player.id);
        setCurrentPlayer(player);
        // **PERFORMANCE FIX**: Connect without reloading the page
        connect(player.id); 
        return;
      }

      // Player ID exists, fetch their data
      try {
        const player = await api.getPlayer(playerId);
        setCurrentPlayer(player);
        // If the socket isn't connected yet, connect it now
        if (!isConnected) {
            connect(playerId);
        }
      } catch (error) {
        console.error("Player not found in DB, creating a new identity.");
        localStorage.removeItem('playerId');
        initializePlayer(); // Restart the process
      }
    };
    initializePlayer();
  }, [connect, isConnected]); // Depend on connect and isConnected

  // This effect handles setting up socket event listeners
  useEffect(() => {
    if (!socket || !isConnected || !currentPlayer) return;

    socket.emit('playerConnected', {
      id: currentPlayer.id,
      username: currentPlayer.username,
    });

    const onUpdatePlayers = (players: OnlinePlayer[]) => {
      setOnlinePlayers(players.filter(p => p.id !== currentPlayer.id));
    };

    const onGameInvite = (data: { inviterId: string; inviterUsername: string }) => {
      if (window.confirm(`${data.inviterUsername} has invited you! Accept?`)) {
        socket.emit('acceptInvite', { inviterId: data.inviterId });
      } else {
        socket.emit('declineInvite', { inviterId: data.inviterId });
      }
    };

    const onInviteAccepted = (data: { message: string }) => {
      alert(data.message);
      setWaitingForResponse(null);
    };

    const onNavigateToGame = (data: { roomId: string }) => {
      router.push(`/game/${data.roomId}`);
    };

    const onInviteDeclined = (data: { message: string }) => {
      setWaitingForResponse(null);
      alert(data.message);
    };

    socket.on('updateOnlinePlayers', onUpdatePlayers);
    socket.on('gameInvite', onGameInvite);
    socket.on('inviteAccepted', onInviteAccepted);
    socket.on('navigateToGame', onNavigateToGame);
    socket.on('inviteDeclined', onInviteDeclined);

    return () => {
      socket.off('updateOnlinePlayers', onUpdatePlayers);
      socket.off('gameInvite', onGameInvite);
      socket.off('inviteAccepted', onInviteAccepted);
      socket.off('navigateToGame', onNavigateToGame);
      socket.off('inviteDeclined', onInviteDeclined);
    };
  }, [socket, isConnected, router, currentPlayer]);

  const handleInvite = (inviteeId: string) => {
    if (!socket) return;
    setWaitingForResponse(inviteeId);
    socket.emit('invitePlayer', { inviteeId });

    // Robustness: Re-enable the button after 20 seconds if no response
    setTimeout(() => {
        setWaitingForResponse(currentId => currentId === inviteeId ? null : currentId);
    }, 20000);
  };

  if (!currentPlayer) {
      return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">Loading Player...</div>
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-900 text-white">
      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-8">Hidden Word Duel</h1>
        <div className="mb-8">
          <h2 className="text-xl mb-4">Your Profile</h2>
          <div className="bg-gray-800 p-4 rounded-lg">
            <p>Username: {currentPlayer.username}</p>
          </div>
        </div>
        <div className="mb-8">
          <h2 className="text-xl mb-4">Online Players</h2>
          {!isConnected ? <p>Connecting to server...</p> : onlinePlayers.length === 0 ? (
            <p className="text-gray-400">No other players online</p>
          ) : (
            <div className="grid gap-4">
              {onlinePlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
                  <span>{player.username}</span>
                  <button
                    onClick={() => handleInvite(player.id)}
                    // **BUG FIX**: Disable only the specific button that was clicked
                    disabled={waitingForResponse === player.id}
                    className="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
}*/


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