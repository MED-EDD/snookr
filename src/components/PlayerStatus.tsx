import React from 'react';

interface PlayerStatusProps {
  player: number;
  score: number;
  active?: boolean;
}

const PlayerStatus: React.FC<PlayerStatusProps> = ({ player, score, active }) => {
  return (
    <div className={`player-status ${active ? 'active' : ''}`}>
      <div className="player-name">Player {player}</div>
      <div className="player-score">{score}</div>
    </div>
  );
};

export default PlayerStatus;
