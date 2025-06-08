// src/app/page.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Socket } from 'socket.io-client';
import { createSocket, OnlinePlayer } from '@/lib/socket';
import { setupInviteHandlers, sendInvite } from '@/lib/gameInvites';

export default function HomePage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<OnlinePlayer | null>(null);
  const [waitingForResponse, setWaitingForResponse] = useState<string | null>(null);

  useEffect(() => {
    let playerId = localStorage.getItem('playerId');
    if (!playerId) {
      playerId = uuidv4();
      localStorage.setItem('playerId', playerId);
    }

    console.log('Initializing socket connection...');
    const socket = createSocket(playerId);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected successfully');
      socket.emit('playerConnected', {
        id: playerId,
        username: `Player_${playerId.slice(0, 4)}`
      });
    });

    socket.on('updateOnlinePlayers', (players) => {
      console.log('Received online players:', players);
      setOnlinePlayers(players.filter(p => p.id !== playerId));
      const self = players.find(p => p.id === playerId);
      if (self) setCurrentPlayer(self);
    });

    // Important: Handle game invite with proper dialog
    socket.on('gameInvite', (data) => {
      console.log('Received game invite from:', data.inviterUsername);
      // Use custom confirm dialog
      if (window.confirm(`${data.inviterUsername} has invited you to a duel! Do you accept?`)) {
        console.log('Accepting invite from:', data.inviterId);
        socket.emit('acceptInvite', { inviterId: data.inviterId });
      } else {
        console.log('Declining invite from:', data.inviterId);
        socket.emit('declineInvite', { inviterId: data.inviterId });
      }
    });

    socket.on('inviteSuccess', async (data) => {
      setWaitingForResponse(null);
      try {
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        alert(data.message);
        router.push(`/game/${data.roomId}`);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    });

    socket.on('inviteDeclined', (data) => {
      setWaitingForResponse(null);
      alert('Player declined your invitation');
    });

    socket.on('inviteFailed', (data) => {
      setWaitingForResponse(null);
      alert(data.message);
    });

    // Setup invite handlers
    setupInviteHandlers(
      socket,
      setWaitingForResponse,
      (roomId) => router.push(`/game/${roomId}`)
    );

    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [router]);

  const handleInvite = (inviteeId: string) => {
    if (socketRef.current) {
      sendInvite(socketRef.current, inviteeId, setWaitingForResponse);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-900 text-white">
      <div className="w-full max-w-5xl items-center justify-between font-mono text-sm flex">
        <h1 className="text-xl font-bold">Hidden Word Duel Lobby</h1>
        <div className="text-right">
          {currentPlayer ? (
            <span className="text-green-400">Welcome, {currentPlayer.username}</span>
          ) : (
            <span className="text-yellow-400">Connecting...</span>
          )}
        </div>
      </div>

      <div className="mt-16 w-full max-w-2xl">
        <h2 className="text-2xl font-semibold mb-4 text-center">Players Online</h2>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 min-h-[200px]">
          {onlinePlayers.length > 0 ? (
            <ul className="space-y-3">
              {onlinePlayers.map((player) => (
                <li key={player.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                  <div className="flex items-center">
                    <span className="relative flex h-3 w-3 mr-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span>{player.username}</span>
                  </div>
                  <button
                    onClick={() => handleInvite(player.id)}
                    disabled={waitingForResponse === player.id}
                    className={`px-4 py-1 text-sm font-semibold text-white rounded-full transition-colors ${
                      waitingForResponse === player.id 
                        ? 'bg-gray-600 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {waitingForResponse === player.id ? 'Waiting...' : 'Invite to Duel'}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-400">No other players online</p>
          )}
        </div>
      </div>
    </main>
  );
}