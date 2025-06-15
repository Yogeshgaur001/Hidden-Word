'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/SocketProvider';
import { Player } from '@/lib/api'; // Make sure this import path is correct for your project

// This interface is needed to understand the data from the backend's 'roundStart' event
interface RoundState {
  currentRound: number;
  word: string;
  revealedIndices: number[];
  message: string;
}

interface GameRoomData {
  roomId: string;
  player1: Player;
  player2: Player;
  status: 'waiting' | 'ready' | 'playing';
  hostId: string;
}

export default function GameRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const { socket } = useSocket();

  const [gameRoom, setGameRoom] = useState<GameRoomData | null>(null);
  const [statusText, setStatusText] = useState('Loading Room...');
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're in browser environment before accessing localStorage
    if (typeof window !== 'undefined') {
      setCurrentPlayerId(localStorage.getItem('playerId'));
    }
    
    if (!socket || !roomId) return;
    
    socket.emit('getRoomData', { roomId });

    const onRoomData = (data: { room: GameRoomData }) => {
      setGameRoom(data.room);
      setStatusText('Both players are here. Ready to start!');
    };

    // --- THIS IS THE FIX ---
    // We must listen for 'roundStart' here. This is the new event that
    // signals the very first round has begun.
    const onRoundStart = (data: RoundState) => {
      console.log('First round started. Saving data and navigating to /play...');
      
      // Save the initial game state so the next page can load instantly.
      sessionStorage.setItem('initialGameState', JSON.stringify(data));
      
      // Now navigate to the gameplay page.
      router.push(`/game/${roomId}/play`);
    };

    socket.on('roomData', onRoomData);
    // Listen for the correct event
    socket.on('roundStart', onRoundStart);

    return () => {
      socket.off('roomData');
      // Always clean up the listener
      socket.off('roundStart');
    };
  }, [socket, roomId, router]);

  const handleStartGame = () => {
    if (!socket || !currentPlayerId) return;
    setStatusText('Starting game...'); 
    socket.emit('startGame', { roomId, playerId: currentPlayerId });
  };

  if (!gameRoom) {
      return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">{statusText}</div>;
  }
  
  const canStartGame = gameRoom.status !== 'playing';

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-white mb-4">
            Game Room
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player 1 */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-white mb-2">
                Player 1
              </h2>
              <p><span className="text-yellow-400 font-semibold">Username:</span> {gameRoom.player1.username}</p>
              <p><span className="text-yellow-400 font-semibold">ID:</span> {gameRoom.player1.id}</p>
              {gameRoom.player1.id === currentPlayerId && <p className="text-green-400">(You)</p>}
            </div>

            {/* Player 2 */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-white mb-2">
                Player 2
              </h2>
              <p><span className="text-blue-400 font-semibold">Username:</span> {gameRoom.player2.username}</p>
              <p><span className="text-blue-400 font-semibold">ID:</span> {gameRoom.player2.id}</p>
              {gameRoom.player2.id === currentPlayerId && <p className="text-green-400">(You)</p>}
            </div>
          </div>

          {/* Game Controls */}
          <div className="mt-6 flex gap-4 justify-center">
            {canStartGame && (
              <button
                onClick={handleStartGame}
                className="w-full py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 font-bold"
              >
                Start Game
              </button>
            )}
            <button className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-400 font-bold">
              Leave Room
            </button>
          </div>

          <div className="text-center text-xl my-4 text-gray-300">{statusText}</div>
        </div>
      </div>
    </div>
  );
}