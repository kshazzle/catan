import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { socketService } from '../../services/socket';
import { RulesPanel } from './RulesPanel';
import './Home.css';

export function Home() {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { setView, setPlayerName: setGlobalName, setPlayerId, reducedMotion, setReducedMotion } = useGameStore();

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const result = await socketService.createRoom(playerName.trim());
    
    if (result.success) {
      setGlobalName(playerName.trim());
      setPlayerId(socketService.getSocketId() || null);
      setView('lobby');
    } else {
      setError(result.error || 'Failed to create room');
    }
    
    setLoading(false);
  };

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const result = await socketService.joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    
    if (result.success) {
      setGlobalName(playerName.trim());
      setPlayerId(socketService.getSocketId() || null);
      setView('lobby');
    } else {
      setError(result.error || 'Failed to join room');
    }
    
    setLoading(false);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="home-container">
      <motion.div 
        className="home-content"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Logo and Title */}
        <motion.div className="home-header" variants={itemVariants}>
          <div className="logo-container">
            <div className="logo-hex">
              <span className="logo-icon">⬡</span>
            </div>
          </div>
          <h1 className="game-title">
            <span className="text-gradient">HexLands</span>
          </h1>
          <p className="game-subtitle">Conquer the Island</p>
        </motion.div>

        {/* Main Card */}
        <motion.div className="glass-card home-card" variants={itemVariants}>
          {mode === 'menu' && (
            <div className="menu-buttons">
              <motion.button
                className="btn-primary btn-large"
                onClick={() => setMode('create')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="btn-icon-left">✦</span>
                Create Game
              </motion.button>
              
              <motion.button
                className="btn-primary btn-large btn-secondary-gradient"
                onClick={() => setMode('join')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="btn-icon-left">→</span>
                Join Game
              </motion.button>
            </div>
          )}

          {mode === 'create' && (
            <motion.div 
              className="form-container"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <button className="back-btn" onClick={() => setMode('menu')}>
                ← Back
              </button>
              <h2>Create a New Game</h2>
              <div className="form-group">
                <label>Your Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  autoFocus
                />
              </div>
              {error && <div className="form-error">{error}</div>}
              <button 
                className="btn-primary w-full mt-4"
                onClick={handleCreateGame}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Game'}
              </button>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div 
              className="form-container"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <button className="back-btn" onClick={() => setMode('menu')}>
                ← Back
              </button>
              <h2>Join a Game</h2>
              <div className="form-group">
                <label>Your Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Room Code</label>
                <input
                  type="text"
                  className="input room-code-input"
                  placeholder="ABC123"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>
              {error && <div className="form-error">{error}</div>}
              <button 
                className="btn-primary w-full mt-4"
                onClick={handleJoinGame}
                disabled={loading}
              >
                {loading ? 'Joining...' : 'Join Game'}
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Rules Panel */}
        <motion.div variants={itemVariants}>
          <RulesPanel />
        </motion.div>

        {/* Settings */}
        <motion.div className="home-settings" variants={itemVariants}>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
            />
            <span>Reduce motion</span>
          </label>
        </motion.div>
      </motion.div>
    </div>
  );
}

