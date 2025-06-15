'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Interface for the data coming from the backend
interface MatchResults {
  winnerId: string | null;
  scores: { [playerId: string]: number };
}

// Interface for the local state we will calculate
interface DisplayResults {
  isWinner: boolean;
  isDraw: boolean;
  playerScore: number;
  opponentScore: number;
}

export default function GameSummary() {
  const router = useRouter();
  // We will store the calculated results for display
  const [displayResults, setDisplayResults] = useState<DisplayResults | null>(null);

  useEffect(() => {
    // Check if we're in browser environment before accessing storage APIs
    if (typeof window === 'undefined') {
      return;
    }

    // We now read from 'sessionStorage' as set by the play page
    const storedResults = sessionStorage.getItem('matchResults');
    const currentPlayerId = localStorage.getItem('playerId');

    if (!storedResults || !currentPlayerId) {
      // If there's no data, redirect home
      router.push('/');
      return;
    }

    // --- THIS IS THE NEW LOGIC ---
    // 1. Parse the data from the backend
    const results: MatchResults = JSON.parse(storedResults);
    
    // 2. Determine who the opponent is
    const opponentId = Object.keys(results.scores).find(id => id !== currentPlayerId);
    
    // 3. Get the scores from the 'scores' object using the IDs
    const playerScore = results.scores[currentPlayerId] || 0;
    const opponentScore = opponentId ? results.scores[opponentId] : 0;

    // 4. Calculate the final state for the UI
    setDisplayResults({
      isWinner: results.winnerId === currentPlayerId,
      isDraw: results.winnerId === null,
      playerScore: playerScore,
      opponentScore: opponentScore,
    });

    // 5. Clean up sessionStorage
    sessionStorage.removeItem('matchResults');

  }, [router]);

  // The loading state now depends on 'displayResults'
  if (!displayResults) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-2xl">Loading results...</div>
      </div>
    );
  }

  // --- THE REST OF YOUR JSX IS PERFECT AND DOES NOT NEED TO CHANGE ---
  // It will now use the correctly calculated 'displayResults' state.
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center bg-gray-800 p-8 rounded-lg shadow-2xl">
        <h1 className="text-5xl font-bold mb-4">Game Over</h1>
        <div className="text-2xl mb-8">
          {displayResults.isDraw ? (
            <span className="text-yellow-400 font-semibold">It's a Draw!</span>
          ) : displayResults.isWinner ? (
            <span className="text-green-400 font-semibold">Congratulations, You Won!</span>
          ) : (
            <span className="text-red-400 font-semibold">You Lost. Better luck next time!</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10 text-lg">
          <div className="bg-gray-700 p-4 rounded-lg">
            <h2 className="text-xl mb-2 text-blue-300">Your Score</h2>
            <div className="text-4xl font-bold">{displayResults.playerScore}</div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <h2 className="text-xl mb-2 text-purple-300">Opponent's Score</h2>
            <div className="text-4xl font-bold">{displayResults.opponentScore}</div>
          </div>
        </div>

        <button
          onClick={() => router.push('/')}
          className="w-full px-8 py-3 bg-blue-600 rounded-lg text-lg font-bold hover:bg-blue-700 transition"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}