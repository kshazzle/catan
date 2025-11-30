import { motion } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { socketService } from '../../services/socket';
import { PlayerColor } from '../../types';
import './VictoryModal.css';

const PLAYER_COLORS: Record<PlayerColor, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  coral: '#f97316',
  violet: '#a855f7',
};

export function VictoryModal() {
  const { gameState, playerId, setView } = useGameStore();
  
  if (!gameState || !gameState.winnerId) return null;
  
  const winner = gameState.players.find(p => p.id === gameState.winnerId);
  const isWinner = gameState.winnerId === playerId;
  const sortedPlayers = [...gameState.players].sort((a, b) => b.victoryPoints - a.victoryPoints);
  
  const handleLeave = () => {
    socketService.leaveRoom();
    setView('home');
  };
  
  return (
    <div className="modal-overlay victory-overlay">
      <motion.div
        className="modal-content victory-modal"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
      >
        {/* Confetti effect */}
        <div className="confetti-container">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="confetti"
              initial={{ 
                y: -20, 
                x: Math.random() * 400 - 200,
                opacity: 1,
                rotate: 0
              }}
              animate={{ 
                y: 500, 
                opacity: 0,
                rotate: Math.random() * 720 - 360
              }}
              transition={{ 
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.5,
                repeat: Infinity
              }}
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#ec4899', '#8b5cf6', '#22d3ee', '#22c55e', '#f97316'][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
        
        <motion.div 
          className="trophy"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          🏆
        </motion.div>
        
        <h2 className="victory-title">
          {isWinner ? 'You Win!' : `${winner?.name} Wins!`}
        </h2>
        
        <p className="victory-subtitle">
          Victory achieved with {winner?.victoryPoints} points!
        </p>
        
        {/* Standings */}
        <div className="standings">
          <h3>Final Standings</h3>
          <div className="standings-list">
            {sortedPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                className={`standing-row ${player.id === gameState.winnerId ? 'winner' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <span className="standing-rank">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                </span>
                <div 
                  className="standing-avatar"
                  style={{ backgroundColor: PLAYER_COLORS[player.color] }}
                >
                  {player.name.charAt(0)}
                </div>
                <span className="standing-name">
                  {player.name}
                  {player.id === playerId && ' (You)'}
                </span>
                <span className="standing-vp">{player.victoryPoints} VP</span>
              </motion.div>
            ))}
          </div>
        </div>
        
        <button className="btn-primary" onClick={handleLeave}>
          Back to Home
        </button>
      </motion.div>
    </div>
  );
}

