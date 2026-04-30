import React from 'react';
import Sidebar from './Sidebar';
import DemoCanvas from '../game/DemoCanvas';


interface MenuProps {
  onStartGame: () => void;
  onOpenSettings?: () => void;
  onMultiplayer?: () => void;
}

const Menu: React.FC<MenuProps> = ({ onStartGame, onOpenSettings, onMultiplayer }) => {
  return (
    <div className="menu-with-sidebar">
      <Sidebar
        onStartGame={onStartGame}
        onOpenSettings={onOpenSettings}
        onMultiplayer={onMultiplayer}
      />
      <div className="menu-content-area">
        <DemoCanvas />
      </div>
    </div>
  );
};

export default Menu;
