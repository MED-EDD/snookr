import { useState } from 'react';
import Menu from './components/Menu';
import Sidebar from './components/Sidebar';
import DemoCanvas from './game/DemoCanvas';
import GameCanvas from './game/GameCanvas';

function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing'>('menu');

  const startGame = () => {
    setGameState('playing');
  };

  const openSettings = () => {
    console.log('Open settings');
    alert('Settings not implemented yet :)');
  };

  const startMultiplayer = () => {
    console.log('Start multiplayer');
    alert('Multiplayer not implemented in this demo :)');
  };

  const returnToMenu = () => {
    setGameState('menu');
  };

  return (
    <div className="app-layout">
      {/* Background Animation Layer */}
      <div className="background-layer">
        <DemoCanvas />
      </div>

      {/* Sidebar Navigation */}
      <Sidebar 
        onStartGame={startGame} 
        onOpenSettings={openSettings} 
        onMultiplayer={startMultiplayer} 
      />

      {/* Main Content Area */}
      <main className="main-content">
        {gameState === 'menu' && (
          <Menu 
            onStartGame={startGame} 
            onOpenSettings={openSettings} 
            onMultiplayer={startMultiplayer} 
          />
        )}
        {gameState === 'playing' && (
          <div className="game-container">
            <GameCanvas onReturnToMenu={returnToMenu} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
