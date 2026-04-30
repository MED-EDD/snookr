import React, { useEffect, useState } from 'react';
import PlayerStatus from './PlayerStatus';

interface GameHUDProps {
  engineRef: any;
}

const GameHUD: React.FC<GameHUDProps> = ({ engineRef }) => {
  const [scores, setScores] = useState({1:0,2:0});
  const [current, setCurrent] = useState(1);

  useEffect(() => {
    let raf = 0;
    function tick() {
      const eng = engineRef?.current;
      if (eng) {
        setScores({...eng.rules.scores});
        setCurrent(eng.rules.currentPlayer);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engineRef]);

  return (
    <div className="game-hud">
      <div className="players-row">
        <PlayerStatus player={1} score={scores[1]} active={current===1} />
        <div className="turn-indicator">&larr; Turn</div>
        <PlayerStatus player={2} score={scores[2]} active={current===2} />
      </div>
    </div>
  );
};

export default GameHUD;
