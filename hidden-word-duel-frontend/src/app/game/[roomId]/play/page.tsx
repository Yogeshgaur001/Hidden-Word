'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createSocket } from '@/lib/socket';

interface GameState {
  word: string;
  revealedIndices: number[];
  guessedWords: {
    [playerId: string]: string;
  };
  winner: string | null;
  isDraw: boolean;
  currentTick: number;
  status: 'waiting' | 'playing' | 'finished';
}

export default function GamePlay() {
  const params = useParams();
  const roomId = params?.roomId as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    word: '',
    revealedIndices: [],
    guessedWords: {},
    winner: null,
    isDraw: false,
    currentTick: 0,
    status: 'waiting'
  });
  const [guess, setGuess] = useState('');
  const [timeUntilNextReveal, setTimeUntilNextReveal] = useState(5);

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

    const socket = createSocket(playerId);

    socket.on('connect', () => {
      console.log('Connected to game:', roomId);
      socket.emit('joinGame', { 
        roomId,
        playerId 
      });
    });

    socket.on('gameStarted', (data: { word: string }) => {
      setGameState(prev => ({
        ...prev,
        word: data.word,
        status: 'playing'
      }));
      setLoading(false);
    });

    socket.on('letterRevealed', (data: { index: number }) => {
      setGameState(prev => ({
        ...prev,
        revealedIndices: [...prev.revealedIndices, data.index],
        currentTick: prev.currentTick + 1
      }));
      setTimeUntilNextReveal(5);
    });

    socket.on('guessSubmitted', (data: { playerId: string, guess: string }) => {
      setGameState(prev => ({
        ...prev,
        guessedWords: {
          ...prev.guessedWords,
          [data.playerId]: data.guess
        }
      }));
    });

    socket.on('gameEnded', (data: { winner: string | null, isDraw: boolean }) => {
      setGameState(prev => ({
        ...prev,
        winner: data.winner,
        isDraw: data.isDraw,
        status: 'finished'
      }));
    });

    socket.on('gameError', (data) => {
      console.error('Game error:', data.message);
      setError(data.message);
      setLoading(false);
    });

    socket.connect();

    // Timer for countdown
    const timer = setInterval(() => {
      setTimeUntilNextReveal(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      socket.disconnect();
      clearInterval(timer);
    };
  }, [roomId]);

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const playerId = localStorage.getItem('playerId');
    if (!playerId || !guess.trim()) return;

    const socket = createSocket(playerId);
    socket.emit('submitGuess', {
      roomId,
      playerId,
      guess: guess.trim().toLowerCase()
    });
    setGuess('');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-2xl">Loading game...</div>
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
        <h1 className="text-3xl font-bold mb-8">Hidden Word Duel</h1>
        
        <div className="grid grid-cols-1 gap-8">
          {/* Game Board */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-center space-y-6">
              {/* Timer */}
              <div className="text-xl font-semibold">
                Next reveal in: <span className="text-yellow-400">{timeUntilNextReveal}s</span>
              </div>

              {/* Word Display */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Hidden Word</h2>
                <div className="flex justify-center gap-2">
                  {gameState.word.split('').map((letter, index) => (
                    <div 
                      key={index}
                      className="w-12 h-12 border-2 border-gray-600 rounded flex items-center justify-center text-2xl"
                    >
                      {gameState.revealedIndices.includes(index) ? letter : '_'}
                    </div>
                  ))}
                </div>
              </div>

              {/* Guess Input */}
              {gameState.status === 'playing' && (
                <form onSubmit={handleGuessSubmit} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      placeholder="Enter your guess..."
                      className="w-full max-w-md px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200"
                  >
                    Submit Guess
                  </button>
                </form>
              )}

              {/* Game End State */}
              {gameState.status === 'finished' && (
                <div className="mt-8 p-4 bg-gray-700 rounded-lg">
                  {gameState.isDraw ? (
                    <p className="text-xl font-bold text-yellow-400">It's a draw!</p>
                  ) : gameState.winner ? (
                    <p className="text-xl font-bold text-green-400">
                      {gameState.winner === localStorage.getItem('playerId')
                        ? 'You won!'
                        : 'Your opponent won!'}
                    </p>
                  ) : (
                    <p className="text-xl font-bold text-red-400">Game Over - No winner</p>
                  )}
                  <p className="mt-2 text-gray-300">The word was: {gameState.word}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 