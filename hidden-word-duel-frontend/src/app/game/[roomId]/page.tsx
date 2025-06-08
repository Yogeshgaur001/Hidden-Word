'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createSocket, OnlinePlayer, GameRoom } from '@/lib/socket';

export default function GameRoom() {
  const params = useParams();
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const playerId = localStorage.getItem('playerId');
    if (!playerId) {
      setError('Player ID not found');
      setLoading(false);
      return;
    }

    const socket = createSocket(playerId);

    socket.on('connect', () => {
      console.log('Connecting to room:', params.roomId);
      // Use joinGameRoom instead of joinRoom
      socket.emit('joinGameRoom', { 
        roomId: params.roomId as string,
        playerId 
      });
    });

    // Listen for room joined event
    socket.on('roomJoined', (data) => {
      console.log('Room joined:', data.room);
      setGameRoom(data.room);
      setLoading(false);
    });

    // Listen for player joined event
    socket.on('playerJoined', (data) => {
      console.log('Player joined:', data);
      setGameRoom(data.room);
    });

    // Listen for game ready event
    socket.on('gameReady', (data) => {
      console.log('Game ready:', data);
      setGameRoom(data.room);
    });

    socket.on('roomError', (data) => {
      console.error('Room error:', data.message);
      setError(data.message);
      setLoading(false);
    });

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [params.roomId]);

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
                    <span>{gameRoom.player1.username}</span>
                  </div>
                  <span className="text-sm text-blue-400">Player 1</span>
                </div>
              )}
              {gameRoom?.player2 && (
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span>{gameRoom.player2.username}</span>
                  </div>
                  <span className="text-sm text-blue-400">Player 2</span>
                </div>
              )}
              {(!gameRoom?.player1 || !gameRoom?.player2) && (
                <div className="text-yellow-400 text-center p-3">
                  Waiting for other player to join...
                </div>
              )}
            </div>
          </div>

          {/* Game Status Section */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Game Status</h2>
            <div className="text-center">
              {gameRoom?.status === 'ready' ? (
                <p className="text-green-400">Game ready to start!</p>
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