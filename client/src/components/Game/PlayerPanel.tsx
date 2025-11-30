import { motion } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { Player, PlayerColor } from '../../types';
import './PlayerPanel.css';

const PLAYER_COLORS: Record<PlayerColor, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  coral: '#f97316',
  violet: '#a855f7',
};

interface PlayerCardProps {
  player: Player;
  isCurrentPlayer: boolean;
  isMe: boolean;
  hasLongestRoad: boolean;
  hasLargestArmy: boolean;
}

function PlayerCard({ player, isCurrentPlayer, isMe, hasLongestRoad, hasLargestArmy }: PlayerCardProps) {
  const totalResources = Object.values(player.resources).reduce((a, b) => a + b, 0);
  const devCardCount = player.devCards?.length ?? 0;
  
  return (
    <motion.div
      className={`player-card-game ${isCurrentPlayer ? 'current-turn' : ''} ${isMe ? 'is-me' : ''} player-${player.color}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      style={{ '--player-color': PLAYER_COLORS[player.color] } as React.CSSProperties}
    >
      <div className="player-header">
        <div 
          className="player-avatar-game"
          style={{ backgroundColor: PLAYER_COLORS[player.color] }}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
        <div className="player-details">
          <span className="player-name-game">
            {player.name}
            {isMe && <span className="me-badge">You</span>}
          </span>
          {!player.connected && (
            <span className="disconnected-badge">Disconnected</span>
          )}
        </div>
        <div className="player-vp">
          <span className="vp-value">{player.victoryPoints}</span>
          <span className="vp-label">VP</span>
        </div>
      </div>
      
      <div className="player-stats">
        <div className="stat" title="Resource cards">
          <span className="stat-icon">🃏</span>
          <span className="stat-value">{totalResources}</span>
        </div>
        <div className="stat" title="Development cards">
          <span className="stat-icon">📜</span>
          <span className="stat-value">{devCardCount}</span>
        </div>
        <div className="stat" title="Roads built">
          <span className="stat-icon">🛤️</span>
          <span className="stat-value">{player.roadsBuilt}</span>
        </div>
        <div className="stat" title="Knights played">
          <span className="stat-icon">⚔️</span>
          <span className="stat-value">{player.knightsPlayed ?? 0}</span>
        </div>
      </div>
      
      <div className="player-buildings">
        <span className="building-stat" title="Settlements">
          🏠 {player.settlementsBuilt}
        </span>
        <span className="building-stat" title="Cities">
          🏰 {player.citiesBuilt}
        </span>
      </div>
      
      {/* Achievements */}
      <div className="achievements">
        {hasLongestRoad && (
          <div className="achievement longest-road">
            🛣️ Longest Road ({player.longestRoad ?? 0})
          </div>
        )}
        {hasLargestArmy && (
          <div className="achievement largest-army">
            ⚔️ Largest Army ({player.knightsPlayed ?? 0})
          </div>
        )}
      </div>
      
      {isCurrentPlayer && (
        <motion.div 
          className="turn-indicator-dot"
          layoutId="turn-indicator"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </motion.div>
  );
}

export function PlayerPanel() {
  const { gameState, playerId } = useGameStore();
  
  if (!gameState) return null;
  
  const { players, currentPlayerIndex, longestRoadPlayerId, largestArmyPlayerId } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  
  return (
    <div className="player-panel">
      <h3 className="panel-title">Players</h3>
      <div className="players-list-game">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            isCurrentPlayer={player.id === currentPlayer.id}
            isMe={player.id === playerId}
            hasLongestRoad={player.id === longestRoadPlayerId}
            hasLargestArmy={player.id === largestArmyPlayerId}
          />
        ))}
      </div>
    </div>
  );
}
