import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';
import GameHUD from '../components/GameHUD';
import PowerBar from '../components/PowerBar';

interface GameCanvasProps {
  onReturnToMenu: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onReturnToMenu }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      // Create and start engine
      const canvas = canvasRef.current;
      engineRef.current = new GameEngine(canvas, onReturnToMenu);
      engineRef.current.start();
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
    };
  }, [onReturnToMenu]);

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
      <canvas 
        ref={canvasRef}
        width={1200}
        height={600}
        style={{ display: 'block', margin: '0 auto', background: 'transparent' }}
      />

      {/* HUD overlays */}
      <GameHUD engineRef={engineRef} />
      <PowerBar engineRef={engineRef} />
    </div>
  );
};

export default GameCanvas;
