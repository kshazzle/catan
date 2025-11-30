import { useEffect } from 'react';
import { useGameStore } from './state/gameStore';
import { Home } from './components/Home/Home';
import { Lobby } from './components/Lobby/Lobby';
import { Game } from './components/Game/Game';

export default function App() {
  const { view, error, initialize, cleanup, reducedMotion } = useGameStore();

  useEffect(() => {
    initialize();
    return () => cleanup();
  }, [initialize, cleanup]);

  return (
    <div className={reducedMotion ? 'reduced-motion' : ''}>
      <div className="bg-gradient" />
      
      {view === 'home' && <Home />}
      {view === 'lobby' && <Lobby />}
      {view === 'game' && <Game />}
      
      {error && <div className="error-toast">{error}</div>}
    </div>
  );
}

