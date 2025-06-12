'use client';

/*import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSocket } from '@/lib/socket';
import { api, Player } from '@/lib/api';

interface GameRoom {
  roomId: string;
  player1: Player;
  player2: Player;
  status: 'waiting' | 'ready' | 'playing';
}

export default function GameRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const initializeRoom = async () => {
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

      try {
        // Get current player from database
        const player = await api.getPlayer(playerId);
        setCurrentPlayer(player);

        // Create or get existing socket
        const socket = createSocket(playerId);

        // Ensure we're connected before joining
        const joinRoom = () => {
          console.log('Connecting to room:', roomId);
          socket.emit('joinGameRoom', { 
            roomId,
            playerId,
            username: player.username
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
          // Navigate to the play page
          router.push(`/game/${roomId}/play`);
        });

        socket.on('gameError', (data) => {
          console.error('Game error:', data.message);
          setError(data.message);
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
          socket.off('gameError');
          socket.off('roomError');
        };
      } catch (error) {
        console.error('Error initializing room:', error);
        setError('Failed to initialize game room');
        setLoading(false);
      }
    };

    initializeRoom();
  }, [roomId, router]);

  const handleStartGame = () => {
    if (!currentPlayer || !gameRoom) return;

    console.log('Starting game...');
    const socket = createSocket(currentPlayer.id);
    socket.emit('startGame', { 
      roomId,
      player1Id: gameRoom.player1.id,
      player2Id: gameRoom.player2.id
    });
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

  if (!gameRoom || !currentPlayer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-2xl">Waiting for game data...</div>
      </div>
    );
  }

  const isHost = currentPlayer.id === gameRoom.player1.id;
  const canStartGame = gameRoom.status === 'ready' && isHost && gameRoom.player2;

  return (
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-900 text-white">
      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-8">Game Room</h1>
        
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl mb-4">Players</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-yellow-400 mr-2">Host:</span>
                <span>{gameRoom.player1.username}</span>
              </div>
              {gameRoom.player1.id === currentPlayer.id && (
                <span className="text-green-400">(You)</span>
              )}
            </div>
            
            {gameRoom.player2 ? (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-yellow-400 mr-2">Challenger:</span>
                  <span>{gameRoom.player2.username}</span>
                </div>
                {gameRoom.player2.id === currentPlayer.id && (
                  <span className="text-green-400">(You)</span>
                )}
              </div>
            ) : (
              <div className="text-gray-400">Waiting for challenger...</div>
            )}
          </div>
        </div>

        {canStartGame && (
          <button
            onClick={handleStartGame}
            className="w-full py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 font-bold transition-colors"
          >
            Start Game
          </button>
        )}

        {!canStartGame && gameRoom.status === 'waiting' && (
          <div className="text-center text-gray-400">
            Waiting for another player to join...
          </div>
        )}

        {gameRoom.status === 'playing' && (
          <div className="text-center text-green-400">
            Game is starting...
          </div>
        )}
      </div>
    </main>
  );
}*/

// app/game/[roomid]/page.tsx (FINAL)
/*'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/SocketProvider';
import { api, Player } from '@/lib/api';

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
  const { socket, isConnected } = useSocket();

  const [gameRoom, setGameRoom] = useState<GameRoomData | null>(null);
  const [statusText, setStatusText] = useState('Connecting to room...');
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const playerId = localStorage.getItem('playerId');
    if (!playerId) {
      router.push('/');
      return;
    }
    api.getPlayer(playerId).then(setCurrentPlayer);

    if (!socket || !isConnected) return;
    
    // Announce that this client is in the room and ready
    socket.emit('playerReady', { roomId, playerId });

    const onAllPlayersReady = (data: { hostId: string }) => {
      setStatusText('Both players are here! Waiting for the host to start...');
      // A simple way to update host info
      setGameRoom(prev => prev ? { ...prev, status: 'ready', hostId: data.hostId } : null);
    };

    const onGameStarted = () => {
      router.push(`/game/${roomId}/play`);
    };

    const onRoomData = (data: {room: GameRoomData}) => {
        setGameRoom(data.room);
        setStatusText('Waiting for opponent...')
    }
    
    // Initial room data might be sent on join or via a separate event
    // For simplicity, we'll assume a 'roomData' event or handle it in 'navigateToGame'
    // This is a placeholder for how you might receive initial room data
    socket.on('navigateToGame', onRoomData); // piggyback on this event if possible
    socket.on('allPlayersReady', onAllPlayersReady);
    socket.on('gameStarted', onGameStarted);
    socket.on('gameError', (data) => setError(data.message));
    socket.on('roomError', (data) => setError(data.message));

    return () => {
      socket.off('allPlayersReady');
      socket.off('gameStarted');
      socket.off('gameError');
      socket.off('roomError');
      socket.off('navigateToGame');
    };
  }, [socket, isConnected, roomId, router]);

  const handleStartGame = () => {
    // THIS IS THE FIX: We now send `playerId`.
    if (!socket || !currentPlayer) return;
    console.log(`Emitting startGame with playerId: ${currentPlayer.id}`);
    socket.emit('startGame', {
      roomId,
      playerId: currentPlayer.id,
    });
  };

  if (error) return <div>Error: {error}</div>;
  if (!gameRoom || !currentPlayer) return <div>{statusText}</div>;

  const isHost = currentPlayer.id === gameRoom.hostId;
  const canStartGame = gameRoom.status === 'ready' && isHost;

  return (
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-900 text-white">*/
      {/* Your JSX is mostly fine, just make sure it uses the state correctly */}
      /*<div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-8">Game Room</h1>
        
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl mb-4">Players</h2>
          <div className="space-y-4">
              <p><span className="text-yellow-400">Host:</span> {gameRoom.player1.username} {gameRoom.player1.id === currentPlayer.id && '(You)'}</p>
              <p><span className="text-blue-400">Challenger:</span> {gameRoom.player2.username} {gameRoom.player2.id === currentPlayer.id && '(You)'}</p>
          </div>
        </div>

        <div className="text-center text-xl my-4">{statusText}</div>

        {canStartGame && (
          <button
            onClick={handleStartGame}
            className="w-full py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 font-bold transition-colors"
          >
            Start Game
          </button>
        )}
      </div>
    </main>
  );
}*/

// app/game/[roomid]/page.tsx (FINAL)
// app/game/[roomid]/page.tsx (FINAL)




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