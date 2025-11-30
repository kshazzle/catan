import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { ResourceType, DevCardType } from '../../types';
import './ResourceNotification.css';

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

const DEV_CARD_INFO: Record<DevCardType, { icon: string; name: string; description: string }> = {
  knight: { icon: '⚔️', name: 'Knight', description: 'Move the robber and steal a resource' },
  road_building: { icon: '🛤️', name: 'Road Building', description: 'Build 2 roads for free' },
  year_of_plenty: { icon: '🌾', name: 'Year of Plenty', description: 'Take any 2 resources from the bank' },
  monopoly: { icon: '💰', name: 'Monopoly', description: 'Take all of one resource type' },
  victory_point: { icon: '⭐', name: 'Victory Point', description: '+1 VP (keep hidden!)' },
};

interface ResourceGain {
  type: ResourceType;
  amount: number;
}

type NotificationType = 'dice' | 'trade' | 'steal';

export function ResourceNotification() {
  const { gameState, playerId } = useGameStore();
  const [gains, setGains] = useState<ResourceGain[]>([]);
  const [visible, setVisible] = useState(false);
  const [notificationType, setNotificationType] = useState<NotificationType>('dice');
  const [devCard, setDevCard] = useState<DevCardType | null>(null);
  const [devCardVisible, setDevCardVisible] = useState(false);
  
  const prevResourcesRef = useRef<Record<ResourceType, number> | null>(null);
  const prevDiceRollRef = useRef<[number, number] | null>(null);
  const prevDevCardCountRef = useRef<number>(0);
  const prevPhaseRef = useRef<string | null>(null);
  const lastNotificationTimeRef = useRef<number>(0);
  
  useEffect(() => {
    if (!gameState || !playerId) return;
    
    const myPlayer = gameState.players.find(p => p.id === playerId);
    if (!myPlayer) return;
    
    const currentResources = myPlayer.resources;
    const currentDiceRoll = gameState.lastDiceRoll;
    const currentDevCards = myPlayer.devCards || [];
    const currentPhase = gameState.phase;
    const now = Date.now();
    
    // Check for new dev card (count increased from previous)
    if (currentDevCards.length > prevDevCardCountRef.current) {
      const newestCard = currentDevCards[currentDevCards.length - 1];
      if (newestCard) {
        setDevCard(newestCard.type);
        setDevCardVisible(true);
        
        setTimeout(() => {
          setDevCardVisible(false);
        }, 4000);
      }
    }
    prevDevCardCountRef.current = currentDevCards.length;
    
    // Check for resource gains
    if (prevResourcesRef.current && now - lastNotificationTimeRef.current > 500) {
      const resourceGains: ResourceGain[] = [];
      
      for (const type of Object.keys(currentResources) as ResourceType[]) {
        const prev = prevResourcesRef.current[type] || 0;
        const curr = currentResources[type] || 0;
        const diff = curr - prev;
        
        if (diff > 0) {
          resourceGains.push({ type, amount: diff });
        }
      }
      
      if (resourceGains.length > 0) {
        // Determine notification type based on context
        // Dice roll changed if: new roll exists AND (no previous roll OR values differ)
        const diceRollChanged = currentDiceRoll && (
          !prevDiceRollRef.current ||
          currentDiceRoll[0] !== prevDiceRollRef.current[0] || 
          currentDiceRoll[1] !== prevDiceRollRef.current[1]
        );
        
        const wasTradePhase = prevPhaseRef.current === 'trade';
        const wasStealPhase = prevPhaseRef.current === 'robber_steal';
        
        let type: NotificationType = 'dice';
        if (wasStealPhase) {
          type = 'steal';
        } else if (wasTradePhase) {
          type = 'trade';
        } else if (!diceRollChanged && currentPhase === 'main') {
          // Resources changed without dice roll during main phase = trade
          type = 'trade';
        }
        
        setGains(resourceGains);
        setNotificationType(type);
        setVisible(true);
        lastNotificationTimeRef.current = now;
        
        setTimeout(() => {
          setVisible(false);
        }, 3000);
      }
    }
    
    // Update refs
    prevResourcesRef.current = { ...currentResources };
    prevDiceRollRef.current = currentDiceRoll || null;
    prevPhaseRef.current = currentPhase;
  }, [gameState, playerId]);
  
  return (
    <>
      {/* Resource notification */}
      <AnimatePresence>
        {visible && gains.length > 0 && (
          <motion.div
            className={`resource-notification ${notificationType}-notification`}
            initial={{ opacity: 0, x: 100, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <div className="notification-header">
              <span className="notification-icon">
                {notificationType === 'trade' ? '🤝' : notificationType === 'steal' ? '🏴‍☠️' : '🎁'}
              </span>
              <span>
                {notificationType === 'trade' 
                  ? 'Trade Complete!' 
                  : notificationType === 'steal' 
                    ? 'Robber Stole!' 
                    : 'Resources Received!'}
              </span>
            </div>
            <div className="notification-resources">
              {gains.map(({ type, amount }) => (
                <div key={type} className="notification-resource">
                  <span className="resource-emoji">{RESOURCE_ICONS[type]}</span>
                  <span className="resource-info">
                    <span className="resource-amount">+{amount}</span>
                    <span className="resource-name">{RESOURCE_NAMES[type]}</span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Dev card notification */}
      <AnimatePresence>
        {devCardVisible && devCard && (
          <motion.div
            className="devcard-notification"
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          >
            <div className="devcard-notification-header">
              <span className="devcard-notification-icon">🃏</span>
              <span>New Development Card!</span>
            </div>
            <div className="devcard-notification-card">
              <span className="devcard-big-icon">{DEV_CARD_INFO[devCard].icon}</span>
              <div className="devcard-details">
                <span className="devcard-name">{DEV_CARD_INFO[devCard].name}</span>
                <span className="devcard-desc">{DEV_CARD_INFO[devCard].description}</span>
              </div>
            </div>
            {devCard === 'victory_point' && (
              <div className="devcard-tip">💡 Keep this secret until you win!</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

