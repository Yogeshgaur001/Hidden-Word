import React from 'react';
import GameRoom from '../components/GameRoom';
import { useSocket } from '../hooks/useSocket';

const Game: React.FC = () => {
  const { room, currentPlayer, socket } = useSocket();

  const handleStartGame = () => {
    if (room) {
      socket.emit('startGame', { roomId: room.roomId });
    }
  };

  if (!room || !currentPlayer) {
    return <div>Loading...</div>;
  }

  return (
    <div className="game-page">
      <GameRoom
        room={room}
        currentPlayerId={currentPlayer.id}
        onStartGame={handleStartGame}
      />
    </div>
  );
};

export default Game;