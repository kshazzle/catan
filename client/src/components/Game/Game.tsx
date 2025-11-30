import { useGameStore } from '../../state/gameStore';
import { HexBoard } from './HexBoard';
import { ActionBar } from './ActionBar';
import { PlayerPanel } from './PlayerPanel';
import { ActivityLog } from './ActivityLog';
import { TradeModal } from './TradeModal';
import { VictoryModal } from './VictoryModal';
import { RobberModal } from './RobberModal';
import { DiscardModal } from './DiscardModal';
import { ResourceNotification } from './ResourceNotification';
import './Game.css';

export function Game() {
  const { gameState, playerId } = useGameStore();

  if (!gameState) {
    return (
      <div className="game-loading">
        <div className="loading-spinner">⏳</div>
        <p>Loading game...</p>
      </div>
    );
  }

  const needsToDiscard = gameState.discardingPlayerIds?.includes(playerId || '') ?? false;

  return (
    <div className="game-container">
      {/* Player panels */}
      <div className="game-sidebar left">
        <PlayerPanel />
      </div>

      {/* Main game area */}
      <div className="game-main">
        <div className="board-container">
          <HexBoard />
        </div>
        <ActionBar />
      </div>

      {/* Activity log */}
      <div className="game-sidebar right">
        <ActivityLog />
      </div>

      {/* Modals */}
      {gameState.phase === 'trade' && gameState.tradeOffer && <TradeModal />}
      {gameState.phase === 'ended' && <VictoryModal />}
      {gameState.phase === 'robber_steal' && <RobberModal />}
      {needsToDiscard && <DiscardModal />}
      
      {/* Notifications */}
      <ResourceNotification />
    </div>
  );
}

