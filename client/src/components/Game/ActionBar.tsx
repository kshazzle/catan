import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { socketService } from '../../services/socket';
import { ResourceType, DevCardType, DEV_CARD_NAMES, PlayerColor } from '../../types';
import './ActionBar.css';

const RESOURCE_ICONS: Record<ResourceType, string> = {
  wood: '🌲',
  brick: '🧱',
  sheep: '🐑',
  wheat: '🌾',
  ore: '⛰️',
};

const PLAYER_COLORS: Record<PlayerColor, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  coral: '#f97316',
  violet: '#a855f7',
};

export function ActionBar() {
  const { 
    gameState, 
    buildMode, 
    setBuildMode, 
    isMyTurn, 
    canAfford,
    getMyPlayer 
  } = useGameStore();
  
  const [showBankTrade, setShowBankTrade] = useState(false);
  const [showPlayerTrade, setShowPlayerTrade] = useState(false);
  const [showDevCards, setShowDevCards] = useState(false);
  const [showYearOfPlenty, setShowYearOfPlenty] = useState(false);
  const [showMonopoly, setShowMonopoly] = useState(false);
  
  if (!gameState) return null;
  
  const phase = gameState.phase;
  const lastDiceRoll = gameState.lastDiceRoll;
  const roadBuildingRoadsLeft = gameState.roadBuildingRoadsLeft ?? 0;
  const setupRound = gameState.setupRound ?? 1;
  const setupDirection = gameState.setupDirection ?? 'forward';
  const myPlayer = getMyPlayer();
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isSetupPhase = phase === 'setup_settlement' || phase === 'setup_road';
  const isRoadBuildingPhase = phase === 'road_building';
  
  const handleRollDice = () => {
    socketService.rollDice();
  };
  
  const handleEndTurn = () => {
    setBuildMode('none');
    socketService.endTurn();
  };
  
  const toggleBuildMode = (mode: 'road' | 'settlement' | 'city') => {
    setBuildMode(buildMode === mode ? 'none' : mode);
  };
  
  const handleBuyDevCard = () => {
    socketService.buyDevCard();
  };
  
  const renderSetupPhase = () => (
    <div className="action-section setup-phase">
      <div className="setup-info">
        <span className="setup-round">Round {setupRound}</span>
        <span className="setup-direction">{setupDirection === 'forward' ? '→' : '←'}</span>
      </div>
      <div className="action-hint">
        {phase === 'setup_settlement' && isMyTurn() && (
          <span>Click a valid intersection to place your settlement</span>
        )}
        {phase === 'setup_road' && isMyTurn() && (
          <span>Click an edge to place your road</span>
        )}
        {!isMyTurn() && (
          <span>Waiting for {currentPlayer.name} to place...</span>
        )}
      </div>
    </div>
  );
  
  const renderRoadBuildingPhase = () => (
    <div className="action-section road-building-phase">
      <div className="action-hint road-building-hint">
        <span className="road-building-icon">🛤️</span>
        <span>Road Building: Place {roadBuildingRoadsLeft} more road{roadBuildingRoadsLeft !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
  
  const renderDicePhase = () => (
    <div className="action-section">
      <motion.button
        className="btn-primary dice-btn"
        onClick={handleRollDice}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={!isMyTurn()}
      >
        <span className="dice-icon">🎲</span>
        Roll Dice
      </motion.button>
      
      {/* Knight can be played before rolling */}
      {myPlayer && myPlayer.devCards?.some(c => c.type === 'knight' && !c.boughtThisTurn) && !myPlayer.devCardPlayedThisTurn && (
        <button
          className="action-btn knight-btn"
          onClick={() => socketService.playKnight()}
          title="Play Knight (move robber)"
        >
          <span className="action-icon">⚔️</span>
          <span className="action-label">Knight</span>
        </button>
      )}
    </div>
  );
  
  const renderLastRoll = () => {
    if (!lastDiceRoll) return null;
    
    return (
      <motion.div 
        className="dice-result"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        <span className="die">{lastDiceRoll[0]}</span>
        <span className="die-plus">+</span>
        <span className="die">{lastDiceRoll[1]}</span>
        <span className="die-equals">=</span>
        <span className="die-total">{lastDiceRoll[0] + lastDiceRoll[1]}</span>
      </motion.div>
    );
  };
  
  const renderBuildButtons = () => (
    <div className="build-actions">
      <button
        className={`action-btn ${buildMode === 'road' ? 'active' : ''}`}
        onClick={() => toggleBuildMode('road')}
        disabled={!isMyTurn() || !canAfford('road')}
        title="Build Road (1 Wood + 1 Brick)"
      >
        <span className="action-icon">🛤️</span>
        <span className="action-label">Road</span>
      </button>
      
      <button
        className={`action-btn ${buildMode === 'settlement' ? 'active' : ''}`}
        onClick={() => toggleBuildMode('settlement')}
        disabled={!isMyTurn() || !canAfford('settlement')}
        title="Build Settlement (1 each: Wood, Brick, Sheep, Wheat)"
      >
        <span className="action-icon">🏠</span>
        <span className="action-label">Settlement</span>
      </button>
      
      <button
        className={`action-btn ${buildMode === 'city' ? 'active' : ''}`}
        onClick={() => toggleBuildMode('city')}
        disabled={!isMyTurn() || !canAfford('city')}
        title="Upgrade to City (2 Wheat + 3 Ore)"
      >
        <span className="action-icon">🏰</span>
        <span className="action-label">City</span>
      </button>
      
      <button
        className="action-btn"
        onClick={() => setShowBankTrade(true)}
        disabled={!isMyTurn()}
        title="Trade with Bank (4:1 or better with harbors)"
      >
        <span className="action-icon">🏦</span>
        <span className="action-label">Bank</span>
      </button>
      
      <button
        className="action-btn"
        onClick={() => setShowPlayerTrade(true)}
        disabled={!isMyTurn()}
        title="Propose trade with other players"
      >
        <span className="action-icon">🤝</span>
        <span className="action-label">Trade</span>
      </button>
      
      <button
        className="action-btn"
        onClick={handleBuyDevCard}
        disabled={!isMyTurn() || !canAfford('devCard') || (gameState.devCardDeck?.length ?? 0) === 0}
        title="Buy Development Card (1 Sheep + 1 Wheat + 1 Ore)"
      >
        <span className="action-icon">🃏</span>
        <span className="action-label">Dev Card</span>
      </button>
      
      {myPlayer && (myPlayer.devCards?.length ?? 0) > 0 && (
        <button
          className="action-btn"
          onClick={() => setShowDevCards(true)}
          disabled={!isMyTurn()}
          title="Play Development Card"
        >
          <span className="action-icon">✨</span>
          <span className="action-label">Play</span>
        </button>
      )}
    </div>
  );
  
  const renderMainPhase = () => (
    <div className="action-section main-phase">
      {renderLastRoll()}
      {renderBuildButtons()}
      
      <motion.button
        className="btn-secondary end-turn-btn"
        onClick={handleEndTurn}
        disabled={!isMyTurn()}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        End Turn
      </motion.button>
    </div>
  );
  
  const renderResources = () => {
    if (!myPlayer) return null;
    
    return (
      <div className="my-resources">
        {(Object.entries(myPlayer.resources) as [ResourceType, number][]).map(([type, count]) => (
          <div key={type} className="resource-item" title={type}>
            <span className="resource-icon">{RESOURCE_ICONS[type]}</span>
            <span className="resource-count">{count}</span>
          </div>
        ))}
      </div>
    );
  };
  
  const renderBankTradeModal = () => {
    if (!showBankTrade || !myPlayer) return null;
    
    return (
      <BankTradeModal 
        resources={myPlayer.resources}
        gameState={gameState}
        playerId={myPlayer.id}
        onClose={() => setShowBankTrade(false)}
      />
    );
  };
  
  const renderDevCardModal = () => {
    if (!showDevCards || !myPlayer) return null;
    
    return (
      <DevCardModal
        player={myPlayer}
        onClose={() => setShowDevCards(false)}
        onPlayYearOfPlenty={() => {
          setShowDevCards(false);
          setShowYearOfPlenty(true);
        }}
        onPlayMonopoly={() => {
          setShowDevCards(false);
          setShowMonopoly(true);
        }}
      />
    );
  };
  
  return (
    <div className="action-bar glass-card-sm">
      <div className="action-bar-content">
        {/* Turn indicator */}
        <div className="turn-indicator">
          {isMyTurn() ? (
            <span className="your-turn">Your Turn</span>
          ) : (
            <span className="waiting">{currentPlayer.name}'s Turn</span>
          )}
          {!isSetupPhase && phase !== 'roll' && phase !== 'ended' && (
            <span className={`phase-badge ${phase === 'robber_move' ? 'robber-phase' : ''}`}>
              {phase === 'robber_move' ? '🏴‍☠️ ROBBER' : phase.replace('_', ' ')}
            </span>
          )}
        </div>
        
        {/* Phase-specific actions */}
        {isSetupPhase && renderSetupPhase()}
        {isRoadBuildingPhase && renderRoadBuildingPhase()}
        {phase === 'roll' && isMyTurn() && renderDicePhase()}
        {phase === 'main' && renderMainPhase()}
        {phase === 'robber_move' && isMyTurn() && (
          <div className="robber-hint">
            <span className="robber-icon">🏴‍☠️</span>
            <span>Move the robber to a new hex</span>
          </div>
        )}
        
        {/* Resources */}
        {!isSetupPhase && renderResources()}
      </div>
      
      {/* Build mode indicator */}
      <AnimatePresence>
        {buildMode !== 'none' && (
          <motion.div
            className="build-mode-indicator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            Building: <strong>{buildMode}</strong> — Click on the board to place
            <button onClick={() => setBuildMode('none')}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Modals rendered via portal to document.body */}
      {createPortal(
        <>
          {renderBankTradeModal()}
          {renderDevCardModal()}
          {showPlayerTrade && myPlayer && (
            <PlayerTradeModal
              player={myPlayer}
              otherPlayers={gameState.players.filter(p => p.id !== myPlayer.id)}
              onClose={() => setShowPlayerTrade(false)}
            />
          )}
          {showYearOfPlenty && (
            <YearOfPlentyModal onClose={() => setShowYearOfPlenty(false)} />
          )}
          {showMonopoly && (
            <MonopolyModal onClose={() => setShowMonopoly(false)} />
          )}
        </>,
        document.body
      )}
    </div>
  );
}

interface BankTradeModalProps {
  resources: Record<ResourceType, number>;
  gameState: any;
  playerId: string;
  onClose: () => void;
}

function BankTradeModal({ resources, gameState, playerId, onClose }: BankTradeModalProps) {
  const [giving, setGiving] = useState<ResourceType | null>(null);
  const [receiving, setReceiving] = useState<ResourceType | null>(null);
  
  // Calculate trade ratios based on harbors
  const ratios = getPlayerTradeRatios(gameState, playerId);
  
  const handleTrade = () => {
    if (!giving || !receiving || giving === receiving) return;
    const ratio = ratios[giving];
    if (resources[giving] < ratio) return;
    
    socketService.bankTrade({ [giving]: ratio }, { [receiving]: 1 });
    onClose();
  };
  
  const resourceTypes: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
  
  // Find which special harbors the player has
  const playerHarbors = getPlayerHarborList(gameState, playerId);
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div 
        className="modal-content bank-trade-modal"
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <h2>🏦 Bank Trade</h2>
        <p className="trade-info">Trade resources with the bank based on your harbors</p>
        
        {/* Show harbor access */}
        {playerHarbors.length > 0 && (
          <div className="harbor-access">
            <span className="harbor-label">Your Harbors:</span>
            {playerHarbors.map((h, i) => (
              <span key={i} className="harbor-badge">
                {h.type === '3:1' ? '⚓ 3:1' : `${RESOURCE_ICONS[h.type as ResourceType]} 2:1`}
              </span>
            ))}
          </div>
        )}
        
        <div className="trade-sections">
          <div className="trade-section">
            <h3>Give</h3>
            <div className="resource-select">
              {resourceTypes.map(type => {
                const ratio = ratios[type];
                const canTrade = resources[type] >= ratio;
                const hasSpecialHarbor = ratio < 4;
                return (
                  <button
                    key={type}
                    className={`resource-option ${giving === type ? 'selected' : ''} ${hasSpecialHarbor ? 'has-harbor' : ''}`}
                    onClick={() => setGiving(type)}
                    disabled={!canTrade}
                  >
                    <span>{RESOURCE_ICONS[type]}</span>
                    <span className={`ratio ${hasSpecialHarbor ? 'special' : ''}`}>{ratio}:1</span>
                    <span className="count">{resources[type]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="trade-arrow">→</div>
          
          <div className="trade-section">
            <h3>Receive (1)</h3>
            <div className="resource-select">
              {resourceTypes.map(type => (
                <button
                  key={type}
                  className={`resource-option ${receiving === type ? 'selected' : ''}`}
                  onClick={() => setReceiving(type)}
                  disabled={type === giving}
                >
                  <span>{RESOURCE_ICONS[type]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn-primary" 
            onClick={handleTrade}
            disabled={!giving || !receiving || giving === receiving || resources[giving!] < ratios[giving!]}
          >
            Trade
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function getPlayerTradeRatios(gameState: any, playerId: string): Record<ResourceType, number> {
  const defaultRatios: Record<ResourceType, number> = {
    wood: 4, brick: 4, sheep: 4, wheat: 4, ore: 4,
  };
  
  // Find player's settlements/cities on harbors
  const playerVertices = (gameState.board?.vertices ?? []).filter(
    (v: any) => v.playerId === playerId && v.building
  );
  
  for (const vertex of playerVertices) {
    if (vertex.harborId) {
      const harbor = (gameState.board?.harbors ?? []).find((h: any) => h.id === vertex.harborId);
      if (harbor) {
        if (harbor.type === '3:1') {
          for (const r of Object.keys(defaultRatios) as ResourceType[]) {
            if (defaultRatios[r] > 3) defaultRatios[r] = 3;
          }
        } else {
          const resource = harbor.type as ResourceType;
          if (defaultRatios[resource] > 2) defaultRatios[resource] = 2;
        }
      }
    }
  }
  
  return defaultRatios;
}

function getPlayerHarborList(gameState: any, playerId: string): { type: string }[] {
  const harbors: { type: string }[] = [];
  const seenHarborIds = new Set<string>();
  
  const playerVertices = (gameState.board?.vertices ?? []).filter(
    (v: any) => v.playerId === playerId && v.building
  );
  
  for (const vertex of playerVertices) {
    if (vertex.harborId && !seenHarborIds.has(vertex.harborId)) {
      seenHarborIds.add(vertex.harborId);
      const harbor = (gameState.board?.harbors ?? []).find((h: any) => h.id === vertex.harborId);
      if (harbor) {
        harbors.push({ type: harbor.type });
      }
    }
  }
  
  return harbors;
}

interface DevCardModalProps {
  player: any;
  onClose: () => void;
  onPlayYearOfPlenty: () => void;
  onPlayMonopoly: () => void;
}

function DevCardModal({ player, onClose, onPlayYearOfPlenty, onPlayMonopoly }: DevCardModalProps) {
  const handlePlay = (cardType: DevCardType) => {
    if (player.devCardPlayedThisTurn) return;
    
    switch (cardType) {
      case 'knight':
        socketService.playKnight();
        onClose();
        break;
      case 'road_building':
        socketService.playRoadBuilding();
        onClose();
        break;
      case 'year_of_plenty':
        onPlayYearOfPlenty();
        break;
      case 'monopoly':
        onPlayMonopoly();
        break;
    }
  };
  
  // Count cards by type
  const cardCounts: Record<string, number> = {};
  for (const card of player.devCards ?? []) {
    cardCounts[card.type] = (cardCounts[card.type] || 0) + 1;
  }
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content dev-card-modal"
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <h2>Development Cards</h2>
        {player.devCardPlayedThisTurn && (
          <p className="warning-text">You've already played a card this turn</p>
        )}
        
        <div className="dev-card-list">
          {Object.entries(cardCounts).map(([type, count]) => {
            const isPlayable = !player.devCardPlayedThisTurn && 
              type !== 'victory_point' &&
              (player.devCards ?? []).some((c: any) => c.type === type && !c.boughtThisTurn);
            
            return (
              <div key={type} className={`dev-card-item ${isPlayable ? 'playable' : 'disabled'}`}>
                <div className="dev-card-info">
                  <span className="dev-card-name">{DEV_CARD_NAMES[type as DevCardType]}</span>
                  <span className="dev-card-count">×{count}</span>
                </div>
                <span className="dev-card-desc">{getCardDescription(type as DevCardType)}</span>
                {type !== 'victory_point' && (
                  <button
                    className="btn-primary btn-small"
                    onClick={() => handlePlay(type as DevCardType)}
                    disabled={!isPlayable}
                  >
                    Play
                  </button>
                )}
                {type === 'victory_point' && (
                  <span className="vp-note">Revealed at game end</span>
                )}
              </div>
            );
          })}
        </div>
        
        <button className="btn-secondary" onClick={onClose}>Close</button>
      </motion.div>
    </div>
  );
}

function getCardDescription(type: DevCardType): string {
  switch (type) {
    case 'knight': return 'Move the robber and steal a resource';
    case 'road_building': return 'Build 2 roads for free';
    case 'year_of_plenty': return 'Take any 2 resources from the bank';
    case 'monopoly': return 'Take all of one resource type from all players';
    case 'victory_point': return '+1 Victory Point';
  }
}

interface YearOfPlentyModalProps {
  onClose: () => void;
}

function YearOfPlentyModal({ onClose }: YearOfPlentyModalProps) {
  const [resource1, setResource1] = useState<ResourceType | null>(null);
  const [resource2, setResource2] = useState<ResourceType | null>(null);
  
  const resourceTypes: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
  
  const handleConfirm = () => {
    if (resource1 && resource2) {
      socketService.playYearOfPlenty(resource1, resource2);
      onClose();
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <h2>Year of Plenty</h2>
        <p>Choose 2 resources to take from the bank</p>
        
        <div className="resource-picks">
          <div className="resource-pick">
            <h3>First Resource</h3>
            <div className="resource-select">
              {resourceTypes.map(type => (
                <button
                  key={type}
                  className={`resource-option ${resource1 === type ? 'selected' : ''}`}
                  onClick={() => setResource1(type)}
                >
                  <span>{RESOURCE_ICONS[type]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="resource-pick">
            <h3>Second Resource</h3>
            <div className="resource-select">
              {resourceTypes.map(type => (
                <button
                  key={type}
                  className={`resource-option ${resource2 === type ? 'selected' : ''}`}
                  onClick={() => setResource2(type)}
                >
                  <span>{RESOURCE_ICONS[type]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn-primary"
            onClick={handleConfirm}
            disabled={!resource1 || !resource2}
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface MonopolyModalProps {
  onClose: () => void;
}

function MonopolyModal({ onClose }: MonopolyModalProps) {
  const [resource, setResource] = useState<ResourceType | null>(null);
  
  const resourceTypes: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
  
  const handleConfirm = () => {
    if (resource) {
      socketService.playMonopoly(resource);
      onClose();
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <h2>Monopoly</h2>
        <p>Choose a resource to take from all other players</p>
        
        <div className="resource-select monopoly-select">
          {resourceTypes.map(type => (
            <button
              key={type}
              className={`resource-option ${resource === type ? 'selected' : ''}`}
              onClick={() => setResource(type)}
            >
              <span className="resource-emoji">{RESOURCE_ICONS[type]}</span>
              <span className="resource-name">{type}</span>
            </button>
          ))}
        </div>
        
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn-primary"
            onClick={handleConfirm}
            disabled={!resource}
          >
            Take All {resource}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Player Trade Modal
interface PlayerTradeModalProps {
  player: any;
  otherPlayers: any[];
  onClose: () => void;
}

function PlayerTradeModal({ player, otherPlayers, onClose }: PlayerTradeModalProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(
    otherPlayers.length === 1 ? otherPlayers[0].id : null
  );
  const [offering, setOffering] = useState<Record<ResourceType, number>>({
    wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0
  });
  const [requesting, setRequesting] = useState<Record<ResourceType, number>>({
    wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0
  });
  
  const resourceTypes: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
  const targetPlayer = otherPlayers.find(p => p.id === selectedPlayer);
  
  const adjustOffer = (type: ResourceType, delta: number) => {
    const newVal = Math.max(0, Math.min(player.resources[type], offering[type] + delta));
    setOffering({ ...offering, [type]: newVal });
  };
  
  const adjustRequest = (type: ResourceType, delta: number) => {
    const newVal = Math.max(0, requesting[type] + delta);
    setRequesting({ ...requesting, [type]: newVal });
  };
  
  const hasOffer = Object.values(offering).some(v => v > 0);
  const hasRequest = Object.values(requesting).some(v => v > 0);
  
  // Note: Per Catan rules, we can't see what resources other players have
  // The trade may be declined if they don't have enough
  
  const handlePropose = () => {
    if (!selectedPlayer || !hasOffer || !hasRequest) return;
    socketService.proposeTrade({
      toPlayerId: selectedPlayer,
      offering,
      requesting
    });
    onClose();
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content player-trade-modal-v2"
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>🤝 Trade with Player</h2>
        
        {/* Select player - show only if multiple players */}
        {otherPlayers.length > 1 && (
          <div className="trade-player-select-v2">
            {otherPlayers.map(p => {
              const totalCards = Object.values(p.resources as Record<string, number>).reduce((a, b) => a + b, 0);
              return (
                <button
                  key={p.id}
                  className={`player-chip ${selectedPlayer === p.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPlayer(p.id)}
                >
                  <span className="chip-dot" style={{ background: PLAYER_COLORS[p.color as PlayerColor] }} />
                  <span className="chip-name">{p.name}</span>
                  <span className="chip-cards">{totalCards} 🃏</span>
                </button>
              );
            })}
          </div>
        )}
        
        {/* Single player display */}
        {otherPlayers.length === 1 && targetPlayer && (
          <div className="trade-with-single">
            Trading with <strong>{targetPlayer.name}</strong>
          </div>
        )}
        
        {selectedPlayer && targetPlayer && (
          <>
            <div className="trade-grid">
              {/* You Give column */}
              <div className="trade-side give-side">
                <div className="trade-side-header">
                  <span className="trade-side-icon">📤</span>
                  <span>You Give</span>
                </div>
                {resourceTypes.map(type => {
                  const yourAmount = player.resources[type];
                  const offerAmount = offering[type];
                  return (
                    <div key={type} className={`trade-resource-row ${offerAmount > 0 ? 'active' : ''}`}>
                      <span className="trade-res-icon">{RESOURCE_ICONS[type]}</span>
                      <div className="trade-stepper">
                        <button 
                          className="stepper-btn" 
                          onClick={() => adjustOffer(type, -1)} 
                          disabled={offerAmount === 0}
                        >−</button>
                        <span className="stepper-value">{offerAmount}</span>
                        <button 
                          className="stepper-btn" 
                          onClick={() => adjustOffer(type, 1)} 
                          disabled={offerAmount >= yourAmount}
                        >+</button>
                      </div>
                      <span className="trade-res-available">of {yourAmount}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Arrow */}
              <div className="trade-arrow-center">
                <span>⇆</span>
              </div>
              
              {/* You Want column */}
              <div className="trade-side want-side">
                <div className="trade-side-header">
                  <span className="trade-side-icon">📥</span>
                  <span>You Want</span>
                </div>
                {resourceTypes.map(type => {
                  const requestAmount = requesting[type];
                  return (
                    <div key={type} className={`trade-resource-row ${requestAmount > 0 ? 'active' : ''}`}>
                      <span className="trade-res-icon">{RESOURCE_ICONS[type]}</span>
                      <div className="trade-stepper">
                        <button 
                          className="stepper-btn" 
                          onClick={() => adjustRequest(type, -1)} 
                          disabled={requestAmount === 0}
                        >−</button>
                        <span className="stepper-value">{requestAmount}</span>
                        <button 
                          className="stepper-btn" 
                          onClick={() => adjustRequest(type, 1)}
                        >+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Trade info - cards are hidden per Catan rules */}
            {hasOffer && hasRequest && (
              <motion.div 
                className="trade-info-note"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                💡 {targetPlayer.name} has {Object.values(targetPlayer.resources as Record<string, number>).reduce((a, b) => a + b, 0)} cards total (contents hidden)
              </motion.div>
            )}
          </>
        )}
        
        <div className="modal-actions-v2">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button 
            className="btn-propose"
            onClick={handlePropose}
            disabled={!selectedPlayer || !hasOffer || !hasRequest}
          >
            Propose Trade
          </button>
        </div>
      </motion.div>
    </div>
  );
}
