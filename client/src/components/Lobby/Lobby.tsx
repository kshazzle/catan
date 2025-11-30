import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { socketService } from '../../services/socket';
import './Lobby.css';

const PLAYER_COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  coral: '#f97316',
  violet: '#a855f7',
};

export function Lobby() {
  const { room, playerId, setView } = useGameStore();
  const [copied, setCopied] = useState(false);

  if (!room) {
    return (
      <div className="lobby-container">
        <div className="glass-card p-6">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const isHost = room.hostId === playerId;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    socketService.leaveRoom();
    setView('home');
  };

  const handleMaxPlayersChange = (value: number) => {
    socketService.setMaxPlayers(value);
  };

  const handleStartGame = () => {
    socketService.startGame();
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="lobby-container">
      <motion.div 
        className="lobby-content"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div className="lobby-header" variants={itemVariants}>
          <button className="back-link" onClick={handleLeave}>
            ← Leave Room
          </button>
          <h1 className="lobby-title">Game Lobby</h1>
        </motion.div>

        {/* Room Code Card */}
        <motion.div className="glass-card room-code-card" variants={itemVariants}>
          <span className="room-code-label">Room Code</span>
          <div className="room-code-display">
            <span className="room-code-value">{room.code}</span>
            <button 
              className="copy-btn"
              onClick={handleCopyCode}
              title="Copy room code"
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
          <span className="room-code-hint">Share this code with friends to join</span>
        </motion.div>

        {/* Players Card */}
        <motion.div className="glass-card players-card" variants={itemVariants}>
          <div className="players-header">
            <h2>Players ({room.players.length}/{room.maxPlayers})</h2>
            {isHost && (
              <div className="max-players-select">
                <label>Max:</label>
                <select 
                  value={room.maxPlayers}
                  onChange={(e) => handleMaxPlayersChange(Number(e.target.value))}
                  className="select-input"
                >
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
            )}
          </div>

          <div className="players-list">
            {room.players.map((player, index) => (
              <motion.div
                key={player.id}
                className="player-card"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div 
                  className="player-avatar"
                  style={{ backgroundColor: PLAYER_COLORS[player.color] }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="player-info">
                  <span className="player-name">
                    {player.name}
                    {player.id === playerId && <span className="you-badge">(You)</span>}
                  </span>
                  {room.hostId === player.id && (
                    <span className="host-badge">Host</span>
                  )}
                </div>
                <div 
                  className="player-color-dot"
                  style={{ backgroundColor: PLAYER_COLORS[player.color] }}
                />
              </motion.div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="player-card empty">
                <div className="player-avatar empty">?</div>
                <span className="waiting-text">Waiting for player...</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Start Button */}
        {isHost && (
          <motion.div variants={itemVariants}>
            <button
              className="btn-primary start-btn"
              onClick={handleStartGame}
              disabled={room.players.length < 2}
            >
              <span>🎮</span>
              Start Game
            </button>
            {room.players.length < 2 && (
              <p className="start-hint">Need at least 2 players to start</p>
            )}
          </motion.div>
        )}

        {!isHost && (
          <motion.div className="waiting-message" variants={itemVariants}>
            <div className="waiting-spinner">⏳</div>
            <p>Waiting for host to start the game...</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

