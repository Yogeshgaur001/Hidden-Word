'use client';

/*import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSocket } from '@/lib/socket';
import { api, Player } from '@/lib/api';
import { Socket } from 'socket.io-client';

interface PlayerState {
  revealedIndices: number[];
  guessedWords: {
    word: string;
    correct: boolean;
    timestamp: number;
  }[];
  roundsWon: number;
}

interface GameState {
  roomId: string;
  word: string;
  players: {
    [playerId: string]: PlayerState;
  };
  remainingRounds: number;
  currentRound: number;
  roundStartTime: number;
  winner: string | null;
  isDraw: boolean;
  status: 'waiting' | 'playing' | 'finished';
  player1Id: string;
  player2Id: string;
}

export default function GamePlay() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [guessWord, setGuessWord] = useState('');
  const [remainingTime, setRemainingTime] = useState(10);
  const [lastGuessResult, setLastGuessResult] = useState<{success: boolean; message: string} | null>(null);

  useEffect(() => {
    const initializeGame = async () => {
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

      let socket: Socket | null = null;

      try {
        const player = await api.getPlayer(playerId);
        setCurrentPlayer(player);

        socket = createSocket(playerId);

        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setError('Failed to connect to game server');
          setLoading(false);
        });

        const joinGame = () => {
          console.log('Joining game:', roomId);
          socket?.emit('joinGame', { 
            roomId,
            playerId: player.id,
            username: player.username
          });
        };

        socket.on('reconnect', () => {
          console.log('Socket reconnected, rejoining game...');
          joinGame();
        });

        if (socket.connected) {
          joinGame();
        } else {
          socket.on('connect', joinGame);
        }

        socket.on('gameStarted', (data: GameState) => {
          console.log('Game started with data:', data);
          if (data.status === 'playing') {
            setGameState(data);
            setRemainingTime(10);
            setLoading(false);
          }
        });

        socket.on('roundUpdate', (data: { 
          remainingTime: number;
          currentRound: number;
          remainingRounds: number;
        }) => {
          setRemainingTime(Math.ceil(data.remainingTime / 1000));
          setGameState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              currentRound: data.currentRound,
              remainingRounds: data.remainingRounds
            };
          });
        });

        socket.on('wordGuessed', (data: {
          success: boolean;
          playerId?: string;
          word?: string;
          message: string;
        }) => {
          setLastGuessResult({
            success: data.success,
            message: data.message
          });
          if (data.success) {
            setGuessWord('');
          }
        });

        socket.on('roundStart', (data: {
          currentRound: number;
          remainingRounds: number;
          word: string;
          roundStartTime: number;
        }) => {
          setGameState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              word: data.word,
              currentRound: data.currentRound,
              remainingRounds: data.remainingRounds,
              roundStartTime: data.roundStartTime
            };
          });
          setRemainingTime(10);
          setLastGuessResult(null);
          setGuessWord('');
        });

        socket.on('gameOver', (data: {
          winner: string | null;
          finalScores: {[playerId: string]: number};
        }) => {
          localStorage.setItem('gameResults', JSON.stringify({
            winner: data.winner,
            playerScore: data.finalScores[player.id],
            opponentScore: data.finalScores[data.winner === player.id ? Object.keys(data.finalScores).find(id => id !== player.id)! : data.winner!],
            playerId: player.id
          }));
          router.push(`/game/${roomId}/summary`);
        });

        socket.on('gameError', (data: { message: string }) => {
          console.error('Game error:', data.message);
          setError(data.message);
          setLoading(false);
        });

      } catch (error) {
        console.error('Error initializing game:', error);
        setError('Failed to initialize game');
        setLoading(false);
      }

      return () => {
        if (socket) {
          socket.off('connect');
          socket.off('reconnect');
          socket.off('connect_error');
          socket.off('gameStarted');
          socket.off('roundUpdate');
          socket.off('wordGuessed');
          socket.off('roundStart');
          socket.off('gameOver');
          socket.off('gameError');
          socket.disconnect();
        }
      };
    };

    const cleanup = initializeGame();
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [roomId, router]);

  const handleWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlayer || !guessWord.trim() || !gameState) return;

    const socket = createSocket(currentPlayer.id);
    socket.emit('guessWord', {
      roomId,
      playerId: currentPlayer.id,
      word: guessWord.trim()
    });
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

  if (!gameState || !currentPlayer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-2xl">Waiting for game data...</div>
      </div>
    );
  }

  const isPlayer1 = currentPlayer.id === gameState.player1Id;
  const playerState = gameState.players[currentPlayer.id];
  const opponentState = gameState.players[isPlayer1 ? gameState.player2Id : gameState.player1Id];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl">Round {gameState.currentRound}</h1>
          <div className="text-2xl">Time: {remainingTime}s</div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl mb-4">Your Word</h2>
            <div className="text-4xl mb-6 font-mono">
              {gameState.word.split('').map((char, i) => (
                <span key={i} className="mr-2">
                  {playerState?.revealedIndices?.includes(i) ? char : '_'}
                </span>
              ))}
            </div>
            <form onSubmit={handleWordSubmit} className="flex gap-4">
              <input
                type="text"
                value={guessWord}
                onChange={(e) => setGuessWord(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-700 rounded text-white"
                placeholder="Enter your guess..."
              />
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 transition"
              >
                Guess
              </button>
            </form>
            {lastGuessResult && (
              <div className={`mt-4 p-3 rounded ${lastGuessResult.success ? 'bg-green-600' : 'bg-red-600'}`}>
                {lastGuessResult.message}
              </div>
            )}
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl mb-4">Opponent's Word</h2>
            {opponentState ? (
              <div className="text-4xl mb-6 font-mono">
                {gameState.word.split('').map((char, i) => (
                  <span key={i} className="mr-2">
                    {opponentState.revealedIndices?.includes(i) ? char : '_'}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xl text-gray-400">
                Waiting for opponent to join...
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8">
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <h3 className="text-lg mb-2">Your Score</h3>
            <div className="text-2xl">{playerState?.roundsWon || 0}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <h3 className="text-lg mb-2">Opponent's Score</h3>
            <div className="text-2xl">{opponentState?.roundsWon || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
} */

  // app/game/[roomid]/play/page.tsx (FINAL)
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

// Interface for the final results from the backend
interface MatchResults {
  winnerId: string | null;
  scores: { [playerId: string]: number };
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
  const [chances, setChances] = useState(6); // Add state for chances

  useEffect(() => {
    // Load initial chances from a constant if you have one, or default to 6
    const initialChances = 5; 
    setChances(initialChances);

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

    // --- CHANCE LOGIC IS NOW CORRECT ---
    const onWordGuessed = (data: { success: boolean; message: string; remainingChances: number; }) => {
      setFeedback(data);
      if (!data.success) {
        setChances(data.remainingChances); // Update chances only on wrong guess
      }
    };
    
    const onGameOver = (data: { reason: string }) => {
        alert(data.reason); // Individual game over, but match continues
    }

    // --- THIS IS THE NEW LOGIC FOR THE END OF THE MATCH ---
    const onMatchOver = (data: MatchResults) => {
      console.log("Match is over. Results:", data);
      // Save results to sessionStorage to pass to the summary page
      sessionStorage.setItem('matchResults', JSON.stringify(data));
      // Navigate to the summary page
      router.push(`/game/${roomId}/summary`);
    };

    socket.on('roundStart', onRoundStart);
    socket.on('tick', onTick);
    socket.on('wordGuessed', onWordGuessed);
    socket.on('gameOver', onGameOver);
    socket.on('matchOver', onMatchOver); // Listen for the final event
    
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
    if (!socket || !guess.trim() || !playerId) return;
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