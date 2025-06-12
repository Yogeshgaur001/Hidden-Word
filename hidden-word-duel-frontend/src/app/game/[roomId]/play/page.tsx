'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/SocketProvider';

interface RoundState {
  currentRound: number;
  word: string;
  revealedIndices: number[];
  message: string;
}

interface MatchResults {
  winnerId: string | null;
  scores: {
    [playerId: string]: number;
  };
}

export default function GamePlay() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const { socket } = useSocket();

  const [roundState, setRoundState] = useState<RoundState | null>(null);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; success?: boolean } | null>(null);
  const [timer, setTimer] = useState(10);
  const [chances, setChances] = useState(5); // Start with 5 chances

  useEffect(() => {
    const storedState = sessionStorage.getItem('initialGameState');
    if (storedState) {
      const initialState: RoundState = JSON.parse(storedState);
      setRoundState(initialState);
      setFeedback({ message: initialState.message });
      sessionStorage.removeItem('initialGameState');
    }

    if (!socket) return;

    const onRoundStart = (data: RoundState) => {
      setRoundState(data);
      setFeedback({ message: data.message });
      setGuess('');
      setTimer(10);
    };

    const onTick = (data: { timeLeft: number }) => {
      setTimer(data.timeLeft);
    };

    const onWordGuessed = (data: { success: boolean; message: string; remainingChances: number; }) => {
      setFeedback(data);
      if (!data.success) {
        setChances(data.remainingChances);
      }
    };
    
    const onGameOver = (data: { reason: string }) => {
        setFeedback({ message: data.reason, success: false });
    }

    const onMatchOver = (data: MatchResults) => {
      // Store the results in sessionStorage before navigation
      sessionStorage.setItem('matchResults', JSON.stringify(data));
      // Navigate to the summary page
      router.push(`/game/${roomId}/summary`);
    };

    socket.on('roundStart', onRoundStart);
    socket.on('tick', onTick);
    socket.on('wordGuessed', onWordGuessed);
    socket.on('gameOver', onGameOver);
    socket.on('matchOver', onMatchOver);
    
    return () => {
      socket.off('roundStart');
      socket.off('tick');
      socket.off('wordGuessed');
      socket.off('gameOver');
      socket.off('matchOver');
    };
  }, [socket, router, roomId]);

  const handleWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const playerId = localStorage.getItem('playerId');
    if (!socket || !guess.trim() || !playerId || chances <= 0) return;
    socket.emit('guessWord', { roomId, playerId, word: guess });
  };

  if (!roundState) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">Loading Game...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl">Round {roundState.currentRound}</h1>
          <div className="flex gap-6 items-center">
            <div className="text-xl">Chances: <span className="font-bold text-red-500">{chances}</span></div>
            <div className="text-4xl font-bold text-yellow-400">{timer}</div>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl mb-4">The Word</h2>
          <div className="text-4xl mb-6 font-mono tracking-widest">
            {roundState.word.split('').map((char, i) => (
              <span key={i} className="mr-2">
                {roundState.revealedIndices.includes(i) ? char.toUpperCase() : '_'}
              </span>
            ))}
          </div>
          <form onSubmit={handleWordSubmit} className="flex gap-4">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-700 rounded text-white"
              placeholder="Enter your guess..."
              autoFocus
              disabled={chances <= 0}
            />
            <button type="submit" className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 transition" disabled={chances <= 0}>
              Guess
            </button>
          </form>
          {feedback && (
            <div className={`mt-4 p-3 rounded ${feedback.success === false ? 'bg-red-800' : 'bg-green-800'}`}>
              {feedback.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}