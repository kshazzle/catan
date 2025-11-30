import { motion } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { socketService } from '../../services/socket';
import { ResourceType } from '../../types';
import './TradeModal.css';

const RESOURCE_ICONS: Record<ResourceType, string> = {
  wood: '🌲',
  brick: '🧱',
  sheep: '🐑',
  wheat: '🌾',
  ore: '⛰️',
};

const RESOURCE_NAMES: Record<ResourceType, string> = {
  wood: 'Wood',
  brick: 'Brick',
  sheep: 'Sheep',
  wheat: 'Wheat',
  ore: 'Ore',
};

export function TradeModal() {
  const { gameState, playerId } = useGameStore();
  
  if (!gameState?.tradeOffer) return null;
  
  const { tradeOffer, players } = gameState;
  const fromPlayer = players.find(p => p.id === tradeOffer.fromPlayerId);
  const toPlayer = tradeOffer.toPlayerId 
    ? players.find(p => p.id === tradeOffer.toPlayerId)
    : null;
  const myPlayer = players.find(p => p.id === playerId);
  
  const isRecipient = tradeOffer.toPlayerId === playerId;
  const isProposer = tradeOffer.fromPlayerId === playerId;
  
  // Check if recipient can afford the trade (has enough of what's being requested)
  const resourceTypes: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
  const missingResources: { type: ResourceType; need: number; have: number }[] = [];
  
  if (isRecipient && myPlayer) {
    for (const type of resourceTypes) {
      const needed = tradeOffer.requesting[type] || 0;
      const have = myPlayer.resources[type] || 0;
      if (needed > have) {
        missingResources.push({ type, need: needed, have });
      }
    }
  }
  
  const canAffordTrade = missingResources.length === 0;
  
  const renderResources = (resources: Partial<Record<ResourceType, number>>, highlightMissing = false) => {
    const entries = Object.entries(resources).filter(([, count]) => count && count > 0);
    if (entries.length === 0) return <span className="no-resources">Nothing</span>;
    
    return (
      <div className="resource-list">
        {entries.map(([type, count]) => {
          const missing = highlightMissing && missingResources.find(m => m.type === type);
          return (
            <div key={type} className={`resource-badge ${missing ? 'insufficient' : ''}`}>
              <span>{RESOURCE_ICONS[type as ResourceType]}</span>
              <span>×{count}</span>
              {missing && (
                <span className="have-indicator">(you have {missing.have})</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  const handleAccept = () => {
    socketService.respondToTrade(true);
  };
  
  const handleDecline = () => {
    socketService.respondToTrade(false);
  };
  
  const handleCancel = () => {
    socketService.cancelTrade();
  };
  
  // For non-participants, show a non-blocking notification banner instead
  if (!isRecipient && !isProposer) {
    return (
      <motion.div
        className="trade-banner"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
      >
        <span className="trade-banner-icon">🤝</span>
        <span className="trade-banner-text">
          <strong>{fromPlayer?.name}</strong> is trading with <strong>{toPlayer?.name}</strong>
        </span>
      </motion.div>
    );
  }
  
  return (
    <div className="modal-overlay">
      <motion.div
        className="modal-content trade-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="modal-header">
          <h2 className="modal-title">Trade Offer</h2>
          <p className="modal-subtitle">
            {isRecipient 
              ? `${fromPlayer?.name} wants to trade with you`
              : `Waiting for ${toPlayer?.name}'s response...`
            }
          </p>
        </div>
        
        <div className="trade-details">
          <div className="trade-side offering">
            <h3>You receive:</h3>
            {renderResources(tradeOffer.offering)}
          </div>
          
          <div className="trade-arrow-modal">⇄</div>
          
          <div className="trade-side requesting">
            <h3>You give:</h3>
            {renderResources(tradeOffer.requesting, isRecipient)}
          </div>
        </div>
        
        {/* Warning for insufficient resources */}
        {isRecipient && !canAffordTrade && (
          <motion.div 
            className="trade-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="error-icon">⚠️</span>
            <span>
              You don't have enough {missingResources.map(m => RESOURCE_NAMES[m.type]).join(', ')} to accept this trade
            </span>
          </motion.div>
        )}
        
        {isRecipient && (
          <div className="modal-actions">
            <button className="btn-secondary" onClick={handleDecline}>
              Decline
            </button>
            <button 
              className="btn-primary" 
              onClick={handleAccept}
              disabled={!canAffordTrade}
              title={!canAffordTrade ? 'You don\'t have enough resources' : ''}
            >
              {canAffordTrade ? 'Accept Trade' : 'Can\'t Afford'}
            </button>
          </div>
        )}
        
        {isProposer && (
          <div className="modal-actions">
            <button className="btn-secondary" onClick={handleCancel}>
              Cancel Trade
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

