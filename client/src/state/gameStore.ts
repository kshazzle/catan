import { create } from 'zustand';
import { Room, GameState, ViewState, Player, BUILDING_COSTS, ResourceType } from '../types';
import { socketService } from '../services/socket';

interface GameStore {
  // State
  view: ViewState;
  room: Room | null;
  gameState: GameState | null;
  playerId: string | null;
  playerName: string | null;
  error: string | null;
  isConnected: boolean;
  reducedMotion: boolean;
  
  // Build mode
  buildMode: 'none' | 'road' | 'settlement' | 'city';
  
  // Actions
  setView: (view: ViewState) => void;
  setRoom: (room: Room | null) => void;
  setGameState: (gameState: GameState | null) => void;
  setPlayerId: (id: string | null) => void;
  setPlayerName: (name: string | null) => void;
  setError: (error: string | null) => void;
  setConnected: (connected: boolean) => void;
  setBuildMode: (mode: 'none' | 'road' | 'settlement' | 'city') => void;
  setReducedMotion: (reduced: boolean) => void;
  
  // Computed
  getCurrentPlayer: () => Player | null;
  getMyPlayer: () => Player | null;
  isMyTurn: () => boolean;
  isHost: () => boolean;
  canAfford: (building: string) => boolean;
  
  // Socket event handlers
  initialize: () => Promise<void>;
  cleanup: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  view: 'home',
  room: null,
  gameState: null,
  playerId: null,
  playerName: null,
  error: null,
  isConnected: false,
  reducedMotion: false,
  buildMode: 'none',
  
  setView: (view) => set({ view }),
  setRoom: (room) => set({ room }),
  setGameState: (gameState) => set({ gameState }),
  setPlayerId: (playerId) => set({ playerId }),
  setPlayerName: (playerName) => set({ playerName }),
  setError: (error) => set({ error }),
  setConnected: (isConnected) => set({ isConnected }),
  setBuildMode: (buildMode) => set({ buildMode }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  
  getCurrentPlayer: () => {
    const { gameState } = get();
    if (!gameState) return null;
    return gameState.players[gameState.currentPlayerIndex];
  },
  
  getMyPlayer: () => {
    const { gameState, playerId } = get();
    if (!gameState || !playerId) return null;
    return gameState.players.find(p => p.id === playerId) || null;
  },
  
  isMyTurn: () => {
    const { gameState, playerId } = get();
    if (!gameState || !playerId) return false;
    return gameState.players[gameState.currentPlayerIndex].id === playerId;
  },
  
  isHost: () => {
    const { room, playerId } = get();
    if (!room || !playerId) return false;
    return room.hostId === playerId;
  },
  
  canAfford: (building: string) => {
    const player = get().getMyPlayer();
    if (!player) return false;
    
    const cost = BUILDING_COSTS[building];
    if (!cost) return false;
    
    for (const [resource, amount] of Object.entries(cost)) {
      if ((player.resources[resource as ResourceType] || 0) < (amount || 0)) {
        return false;
      }
    }
    return true;
  },
  
  initialize: async () => {
    await socketService.connect();
    set({ isConnected: true, playerId: socketService.getSocketId() });
    
    socketService.on('roomUpdate', (room: unknown) => {
      set({ room: room as Room });
      const state = get();
      if ((room as Room).started && state.view === 'lobby') {
        set({ view: 'game' });
      }
    });
    
    socketService.on('gameUpdate', (gameState: unknown) => {
      set({ gameState: gameState as GameState, buildMode: 'none' });
    });
    
    socketService.on('error', (message: unknown) => {
      set({ error: message as string });
      setTimeout(() => set({ error: null }), 5000);
    });
  },
  
  cleanup: () => {
    socketService.disconnect();
    set({ isConnected: false, room: null, gameState: null });
  },
}));

