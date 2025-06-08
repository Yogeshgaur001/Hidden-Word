import React from 'react';
import './GameRoom.css';
import { GameRoomData } from '../types/game.types';

interface GameRoomProps {
  room: GameRoomData;
  currentPlayerId: string;
  onStartGame: () => void;
}

const GameRoom: React.FC<GameRoomProps> = ({ room, currentPlayerId, onStartGame }) => {
  const isInitiator = currentPlayerId === room.initiator;
  
  return (
    <div className="game-room">
      <div className="players-section">
        <h2>Players</h2>
        <div className="player">
          <span className="status-indicator" />
          <span>{room.player1.username}</span>
          {room.player1.id === room.initiator && <span>(Host)</span>}
        </div>
        <div className="player">
          <span className="status-indicator" />
          <span>{room.player2.username}</span>
          {room.player2.id === room.initiator && <span>(Host)</span>}
        </div>
      </div>

      <div className="game-status">
        <h2>Game Status</h2>
        {room.status === 'ready' && (
          <>
            <div className="instructions">
              {room.instructions?.map((instruction, index) => (
                <p key={index}>{instruction}</p>
              ))}
            </div>
            {isInitiator && (
              <button 
                className="start-game-btn"
                onClick={onStartGame}
              >
                Start Game
              </button>
            )}
          </>
        )}
        {room.status === 'playing' && (
          <div className="game-in-progress">
            Game in progress...
          </div>
        )}
      </div>
    </div>
  );
};

export default GameRoom;