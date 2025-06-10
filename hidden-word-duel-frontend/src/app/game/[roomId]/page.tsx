'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSocket } from '@/lib/socket';

export default function GameRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const [gameRoom, setGameRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setError('Room ID not found');
      setLoading(false);
      return;
    }

    const playerId = localStorage.getItem('playerId');
    if (!playerId) {
      setError('Player ID not found');
      setLoading(false);
      return;
    }

    // Create or get existing socket
    const socket = createSocket(playerId);

    // Ensure we're connected before joining
    const joinRoom = () => {
      console.log('Connecting to room:', roomId);
      socket.emit('joinGameRoom', { 
        roomId,
        playerId 
      });
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.on('connect', joinRoom);
    }

    socket.on('roomJoined', (data) => {
      console.log('Room joined:', data.room);
      setGameRoom(data.room);
      setLoading(false);
    });

    socket.on('gameReady', (data) => {
      console.log('Game ready:', data);
      setGameRoom(data.room);
    });

    socket.on('gameStarted', (data) => {
      console.log('Game started:', data);
      router.push(`/game/${roomId}/play`);
    });

    socket.on('roomError', (data) => {
      console.error('Room error:', data.message);
      setError(data.message);
      setLoading(false);
    });

    return () => {
      socket.off('connect', joinRoom);
      socket.off('roomJoined');
      socket.off('gameReady');
      socket.off('gameStarted');
      socket.off('roomError');
    };
  }, [roomId, router]);

  const handleStartGame = () => {
    const playerId = localStorage.getItem('playerId');
    if (!playerId) return;

    const socket = createSocket(playerId);
    socket.emit('startGame', { roomId });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-2xl">Loading game room...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-900 text-white">
      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-8">Game Room</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Players Section */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Players</h2>
            <div className="space-y-4">
              {gameRoom?.player1 && (
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span>{gameRoom.player1.username || `Player_${gameRoom.player1.id.slice(0, 4)}`}</span>
                  </div>
                  <span className="text-sm text-blue-400">Player 1</span>
                </div>
              )}
              {gameRoom?.player2 && (
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span>{gameRoom.player2.username || `Player_${gameRoom.player2.id.slice(0, 4)}`}</span>
                  </div>
                  <span className="text-sm text-blue-400">Player 2</span>
                </div>
              )}
            </div>
          </div>

          {/* Game Status Section */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Game Status</h2>
            <div className="text-center">
              {gameRoom?.status === 'ready' ? (
                <div className="space-y-4">
                  <div className="bg-gray-700 p-4 rounded-lg text-left">
                    <h3 className="text-lg font-medium mb-3">Game Instructions:</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-300">
                      <li>A random word will be selected and shown as hidden tiles</li>
                      <li>Every 5 seconds, a new letter will be revealed</li>
                      <li>Both players can submit one guess for the full word</li>
                      <li>Game ends when someone guesses correctly or all letters are revealed</li>
                      <li>If both players guess correctly at the same time, it's a draw!</li>
                    </ul>
                  </div>
                  <button 
                    onClick={handleStartGame}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    Start Game
                  </button>
                </div>
              ) : (
                <p className="text-yellow-400">Waiting for all players...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}