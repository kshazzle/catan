import { motion } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { socketService } from '../../services/socket';
import { PlayerColor } from '../../types';
import './RobberModal.css';

const PLAYER_COLORS: Record<PlayerColor, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  coral: '#f97316',
  violet: '#a855f7',
};

export function RobberModal() {
  const { gameState, playerId, isMyTurn } = useGameStore();
  
  if (!gameState || !isMyTurn()) return null;
  
  // Find the hex where the robber is
  const robberHex = gameState.board.hexes.find(h => h.hasRobber);
  if (!robberHex) return null;
  
  // Find players with buildings adjacent to this hex
  const adjacentVertices = gameState.board.vertices.filter(v => 
    v.hexIds.includes(robberHex.id) && v.playerId && v.playerId !== playerId
  );
  
  const playerIds = new Set(adjacentVertices.map(v => v.playerId!));
  const stealablePlayers = gameState.players.filter(p => 
    playerIds.has(p.id) && 
    Object.values(p.resources).reduce((a, b) => a + b, 0) > 0
  );
  
  if (stealablePlayers.length === 0) {
    // No one to steal from, auto-advance
    return null;
  }
  
  const handleSteal = (targetId: string) => {
    socketService.stealResource(targetId);
  };
  
  return (
    <div className="modal-overlay">
      <motion.div
        className="modal-content robber-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="robber-icon">🦹</div>
        <h2>Steal a Resource</h2>
        <p className="robber-hint">Choose a player to steal one random resource from</p>
        
        <div className="steal-options">
          {stealablePlayers.map(player => {
            const totalResources = Object.values(player.resources).reduce((a, b) => a + b, 0);
            
            return (
              <motion.button
                key={player.id}
                className="steal-option"
                onClick={() => handleSteal(player.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div 
                  className="steal-avatar"
                  style={{ backgroundColor: PLAYER_COLORS[player.color] }}
                >
                  {player.name.charAt(0)}
                </div>
                <span className="steal-name">{player.name}</span>
                <span className="steal-cards">{totalResources} cards</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

