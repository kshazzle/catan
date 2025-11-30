import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { LogEntry, PlayerColor } from '../../types';
import './ActivityLog.css';

const PLAYER_COLORS: Record<PlayerColor, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  coral: '#f97316',
  violet: '#a855f7',
};

const TYPE_ICONS: Record<LogEntry['type'], string> = {
  roll: '🎲',
  build: '🔨',
  trade: '🔄',
  robber: '🦹',
  system: '📢',
  victory: '🏆',
  devcard: '📜',
};

export function ActivityLog() {
  const { gameState } = useGameStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState?.log.length]);
  
  if (!gameState) return null;
  
  const { log, players } = gameState;
  
  const getPlayerColor = (playerId: string | null): string | null => {
    if (!playerId) return null;
    const player = players.find(p => p.id === playerId);
    return player ? PLAYER_COLORS[player.color] : null;
  };
  
  return (
    <div className="activity-log">
      <h3 className="panel-title">Activity</h3>
      <div className="log-entries" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {log.slice(-20).map((entry) => (
            <motion.div
              key={entry.id}
              className={`log-entry ${entry.type}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span className="log-icon">{TYPE_ICONS[entry.type]}</span>
              <span 
                className="log-message"
                style={entry.playerId ? { 
                  borderLeftColor: getPlayerColor(entry.playerId) || undefined 
                } : undefined}
              >
                {entry.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

