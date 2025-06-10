'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createSocket } from '@/lib/socket';

interface PlayerState {
  revealedIndices: number[];
  guessedWords: {
    word: string;
    correct: boolean;
    timestamp: number;
  }[];
  completionTime?: number;
  roundsWon: number;
}

interface GameState {
  word: string;
  players: {
    [playerId: string]: PlayerState;
  };
  remainingRounds: number;
  currentRound: number;
  winner: string | null;
  isDraw: boolean;
  status: 'waiting' | 'playing' | 'finished';
}

export default function GamePlay() {
  const params = useParams();
  const roomId = params?.roomId as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    word: '',
    players: {},
    remainingRounds: 5,
    currentRound: 1,
    winner: null,
    isDraw: false,
    status: 'waiting'
  });
  const [guess, setGuess] = useState('');
  const [remainingTime, setRemainingTime] = useState(10);
  const [lastGuessCorrect, setLastGuessCorrect] = useState<boolean | null>(null);
  const [playerId] = useState(() => localStorage.getItem('playerId'));

  useEffect(() => {
    if (!roomId) {
      setError('Room ID not found');
      setLoading(false);
      return;
    }

    if (!playerId) {
      setError('Player ID not found');
      setLoading(false);
      return;
    }

    const socket = createSocket(playerId);

    const joinGame = () => {
      console.log('Joining game:', roomId);
      socket.emit('joinGame', { roomId, playerId });
    };

    if (socket.connected) {
      joinGame();
    } else {
      socket.on('connect', joinGame);
    }

    socket.on('gameStarted', (data: GameState) => {
      setGameState(data);
      setRemainingTime(10);
      setLoading(false);
    });

    socket.on('roundUpdate', (data: { remainingTime: number; currentRound: number; remainingRounds: number }) => {
      setRemainingTime(Math.ceil(data.remainingTime / 1000));
      setGameState(prev => ({
        ...prev,
        currentRound: data.currentRound,
        remainingRounds: data.remainingRounds
      }));
    });

    socket.on('wordGuessed', (data: { playerId: string; word: string; correct: boolean }) => {
      setGameState(prev => ({
        ...prev,
        players: {
          ...prev.players,
          [data.playerId]: {
            ...prev.players[data.playerId],
            guessedWords: [
              ...prev.players[data.playerId].guessedWords,
              { word: data.word, correct: data.correct, timestamp: Date.now() }
            ]
          }
        }
      }));
      if (data.playerId === playerId) {
        setLastGuessCorrect(data.correct);
      }
    });

    socket.on('gameEnded', (data: GameState) => {
      setGameState(data);
    });

    socket.on('gameError', (data) => {
      console.error('Game error:', data.message);
      setError(data.message);
      setLoading(false);
    });

    return () => {
      socket.off('connect', joinGame);
      socket.off('gameStarted');
      socket.off('roundUpdate');
      socket.off('wordGuessed');
      socket.off('gameEnded');
      socket.off('gameError');
    };
  }, [roomId, playerId]);

  const handleWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId || !guess.trim()) return;

    const socket = createSocket(playerId);
    socket.emit('guessWord', {
      roomId,
      word: guess.trim()
    });
    setGuess('');
    setLastGuessCorrect(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-yellow-400">
        <div className="text-2xl">Loading game...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-yellow-400">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  const playerState = gameState.players[playerId!];
  const otherPlayerId = Object.keys(gameState.players).find(id => id !== playerId);
  const otherPlayerState = otherPlayerId ? gameState.players[otherPlayerId] : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-black text-yellow-400">
      {/* Title */}
      <div className="w-full max-w-4xl mb-12">
        <h1 className="text-5xl font-bold text-center mb-4">CAN YOU GUESS</h1>
        <h1 className="text-5xl font-bold text-center">THE WORD?</h1>
      </div>

      {/* Game Info */}
      <div className="w-full max-w-4xl mb-8 flex justify-between items-center">
        <div className="text-xl">
          Round: <span className="font-bold">{gameState.currentRound}/5</span>
        </div>
        <div className="text-xl">
          Time: <span className="font-bold">{remainingTime}s</span>
        </div>
        <div className="text-xl">
          Chances: <span className="font-bold">{gameState.remainingRounds}</span>
        </div>
      </div>

      {/* Heartbeat Line */}
      <div className="w-full max-w-4xl mb-16 relative">
        <div className="h-px bg-yellow-400 w-full"></div>
        <div className="absolute right-0 -top-4 w-16">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-yellow-400">
            <path d="M0 50 L20 50 L30 20 L40 80 L50 50 L60 50 L70 40 L80 60 L90 50 L100 50" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" />
          </svg>
        </div>
      </div>

      {/* Word Display */}
      <div className="w-full max-w-4xl mb-16">
        <div className="grid grid-flow-col gap-4 justify-center">
          {gameState.word.split('').map((letter, index) => (
            <div key={index} className="relative">
              <div className="w-24 h-24 flex items-center justify-center">
                <span className="text-7xl font-bold">
                  {playerState?.revealedIndices.includes(index) ? letter : '_'}
                </span>
              </div>
              <div className="absolute bottom-0 w-full h-1 bg-yellow-400"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Controls */}
      {gameState.status === 'playing' && (
        <div className="w-full max-w-4xl">
          <form onSubmit={handleWordSubmit} className="flex gap-4 justify-center">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Enter your guess..."
              className="px-6 py-3 w-96 text-xl bg-transparent border-2 border-yellow-400 rounded-lg text-yellow-400 placeholder-yellow-400/50 focus:outline-none focus:border-yellow-300"
            />
            <button
              type="submit"
              className="px-8 py-3 bg-yellow-400 text-black text-xl font-bold rounded-lg hover:bg-yellow-300 transition-colors"
            >
              Guess
            </button>
          </form>

          {/* Feedback Message */}
          {lastGuessCorrect !== null && (
            <div className={`text-center mt-4 text-xl ${lastGuessCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {lastGuessCorrect ? 'Correct!' : 'Try again!'}
            </div>
          )}
        </div>
      )}

      {/* Game End State */}
      {gameState.status === 'finished' && (
        <div className="text-center mt-8">
          <h2 className="text-3xl font-bold mb-4">
            {gameState.isDraw ? "It's a Draw!" : gameState.winner === playerId ? 'You Won!' : 'Game Over'}
          </h2>
          <p className="text-xl mb-4">The word was: {gameState.word}</p>
          <div className="grid grid-cols-2 gap-8 mt-8">
            <div>
              <h3 className="text-2xl font-bold mb-2">Your Score</h3>
              <p>Rounds Won: {playerState?.roundsWon || 0}</p>
              {playerState?.completionTime && (
                <p>Completion Time: {(playerState.completionTime / 1000).toFixed(1)}s</p>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Opponent's Score</h3>
              <p>Rounds Won: {otherPlayerState?.roundsWon || 0}</p>
              {otherPlayerState?.completionTime && (
                <p>Completion Time: {(otherPlayerState.completionTime / 1000).toFixed(1)}s</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Previous Guesses */}
      <div className="w-full max-w-4xl mt-12">
        <h2 className="text-2xl font-bold mb-4">Previous Guesses:</h2>
        <div className="grid gap-3">
          {Object.entries(gameState.players).map(([pid, state]) => (
            <div key={pid} className="flex items-center justify-between p-4 border border-yellow-400/30 rounded-lg">
              <span className="text-lg">{pid === playerId ? 'You' : 'Opponent'}</span>
              <div className="flex gap-2">
                {state.guessedWords.map((guess, index) => (
                  <span 
                    key={index} 
                    className={`text-lg font-mono px-2 py-1 rounded ${
                      guess.correct ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'
                    }`}
                  >
                    {guess.word}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
} 