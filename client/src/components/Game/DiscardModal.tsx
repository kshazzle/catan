import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { socketService } from '../../services/socket';
import { ResourceType, Resources } from '../../types';
import './DiscardModal.css';

const RESOURCE_ICONS: Record<ResourceType, string> = {
  wood: '🌲',
  brick: '🧱',
  sheep: '🐑',
  wheat: '🌾',
  ore: '⛰️',
};

const RESOURCE_TYPES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

export function DiscardModal() {
  const { getMyPlayer } = useGameStore();
  const myPlayer = getMyPlayer();
  
  const [discarding, setDiscarding] = useState<Partial<Resources>>({
    wood: 0,
    brick: 0,
    sheep: 0,
    wheat: 0,
    ore: 0,
  });
  
  if (!myPlayer) return null;
  
  const totalResources = Object.values(myPlayer.resources).reduce((a, b) => a + b, 0);
  const mustDiscard = Math.floor(totalResources / 2);
  const currentlyDiscarding = Object.values(discarding).reduce((a, b) => a + (b || 0), 0);
  const canSubmit = currentlyDiscarding === mustDiscard;
  
  const handleAdjust = (type: ResourceType, delta: number) => {
    setDiscarding(prev => {
      const current = prev[type] || 0;
      const max = myPlayer.resources[type];
      const newValue = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [type]: newValue };
    });
  };
  
  const handleSubmit = () => {
    if (canSubmit) {
      socketService.discardResources(discarding);
    }
  };
  
  return (
    <div className="modal-overlay">
      <motion.div
        className="modal-content discard-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="discard-icon">🎲</div>
        <h2>A 7 was Rolled!</h2>
        <p className="discard-hint">
          You have {totalResources} cards. You must discard {mustDiscard}.
        </p>
        
        <div className="discard-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(currentlyDiscarding / mustDiscard) * 100}%` }}
            />
          </div>
          <span className="progress-text">
            {currentlyDiscarding} / {mustDiscard} selected
          </span>
        </div>
        
        <div className="discard-resources">
          {RESOURCE_TYPES.map(type => {
            const have = myPlayer.resources[type];
            const selected = discarding[type] || 0;
            
            if (have === 0) return null;
            
            return (
              <div key={type} className="discard-row">
                <span className="discard-resource">
                  <span className="resource-emoji">{RESOURCE_ICONS[type]}</span>
                  <span className="resource-have">Have: {have}</span>
                </span>
                
                <div className="discard-controls">
                  <button
                    className="adjust-btn"
                    onClick={() => handleAdjust(type, -1)}
                    disabled={selected === 0}
                  >
                    −
                  </button>
                  <span className="discard-count">{selected}</span>
                  <button
                    className="adjust-btn"
                    onClick={() => handleAdjust(type, 1)}
                    disabled={selected >= have || currentlyDiscarding >= mustDiscard}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          Discard {mustDiscard} Cards
        </button>
      </motion.div>
    </div>
  );
}

