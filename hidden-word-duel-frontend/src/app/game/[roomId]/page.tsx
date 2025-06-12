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
    setCurrentPlayerId(localStorage.getItem('playerId'));
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
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-900 text-white">
      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-8">Game Room</h1>
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl mb-4">Players</h2>
          <div className="space-y-4 text-lg">
              <p><span className="text-yellow-400 font-semibold">Player 1:</span> {gameRoom.player1.username} {gameRoom.player1.id === currentPlayerId && <span className="text-green-400">(You)</span>}</p>
              <p><span className="text-blue-400 font-semibold">Player 2:</span> {gameRoom.player2.username} {gameRoom.player2.id === currentPlayerId && <span className="text-green-400">(You)</span>}</p>
          </div>
        </div>
        <div className="text-center text-xl my-4 text-gray-300">{statusText}</div>
        {canStartGame && (
          <button
            onClick={handleStartGame}
            className="w-full py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 font-bold"
          >
            Start Game
          </button>
        )}
      </div>
    </main>
  );
}