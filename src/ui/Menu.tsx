import React from 'react';
import { Play, LogOut, Settings, Users, LogIn, UserPlus } from 'lucide-react';
const logoSrc = '/logo.png';

interface MenuProps {
  onStartGame: () => void;
  onOpenSettings?: () => void;
  onMultiplayer?: () => void;
}

const Menu: React.FC<MenuProps> = ({ onStartGame, onOpenSettings, onMultiplayer }) => {
  return (
    <div className="menu-overlay">
      <header className="menu-header">
        <div className="header-left">
          <img src={logoSrc} alt="logo" className="logo" />
        </div>

        <nav className="menu-nav">
          <button className="auth-btn" onClick={() => alert('Login not implemented')}><LogIn size={16} /> Login</button>
          <button className="auth-btn" onClick={() => alert('Sign in not implemented')}><UserPlus size={16} /> Sign In</button>
        </nav>
      </header>

      <main className="menu-main">
        <h1 className="title">Snooker</h1>

        <button className="btn" onClick={onStartGame}>
          <Play size={20} /> Practice Mode
        </button>

        <button className="btn" onClick={onMultiplayer}>
          <Users size={20} /> Multiplayer
        </button>

        <button className="btn secondary" onClick={onOpenSettings}>
          <Settings size={20} /> Settings
        </button>

        <button className="btn" onClick={() => window.close()}>
          <LogOut size={20} /> Quit
        </button>
      </main>

      <footer className="menu-footer">
        <div className="footer-text">Designed with care · Snooker Demo</div>
      </footer>
    </div>
  );
};

export default Menu;
