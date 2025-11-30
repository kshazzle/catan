import { io, Socket } from 'socket.io-client';
import { Room, GameState, Resources, ResourceType } from '../types';

interface ServerToClientEvents {
  roomUpdate: (room: Room) => void;
  gameUpdate: (gameState: GameState) => void;
  error: (message: string) => void;
  playerDisconnected: (playerId: string) => void;
  playerReconnected: (playerId: string) => void;
}

interface ClientToServerEvents {
  createRoom: (playerName: string, callback: (response: { success: boolean; roomCode?: string; error?: string }) => void) => void;
  joinRoom: (roomCode: string, playerName: string, callback: (response: { success: boolean; error?: string }) => void) => void;
  leaveRoom: () => void;
  setMaxPlayers: (maxPlayers: number) => void;
  startGame: () => void;
  // Setup phase
  placeInitialSettlement: (vertexId: string) => void;
  placeInitialRoad: (edgeId: string) => void;
  // Normal gameplay
  rollDice: () => void;
  buildRoad: (edgeId: string) => void;
  buildSettlement: (vertexId: string) => void;
  buildCity: (vertexId: string) => void;
  moveRobber: (hexId: string) => void;
  stealResource: (targetPlayerId: string) => void;
  discardResources: (resources: Partial<Resources>) => void;
  proposeTrade: (offer: { toPlayerId: string | null; offering: Partial<Resources>; requesting: Partial<Resources> }) => void;
  respondToTrade: (accept: boolean) => void;
  cancelTrade: () => void;
  bankTrade: (giving: Partial<Resources>, receiving: Partial<Resources>) => void;
  endTurn: () => void;
  // Development cards
  buyDevCard: () => void;
  playKnight: () => void;
  playRoadBuilding: () => void;
  playYearOfPlenty: (resource1: ResourceType, resource2: ResourceType) => void;
  playMonopoly: (resource: ResourceType) => void;
}

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// In development, use localhost. In production, use the VITE_API_URL environment variable
// Fallback to Render backend if env var not set (for production builds)
const SOCKET_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:3001' : 'https://hexlands-server.onrender.com');

class SocketService {
  private socket: TypedSocket | null = null;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      // Try polling first for Render free tier compatibility, then upgrade to websocket
      this.socket = io(SOCKET_URL, {
        transports: ['polling', 'websocket'], // Try polling first
        upgrade: true, // Allow upgrade to websocket
        timeout: 20000, // 20 seconds
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        forceNew: false,
      });

      this.socket.on('connect', () => {
        console.log('Connected to server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });

      // Setup event forwarding
      this.socket.on('roomUpdate', (room) => {
        this.emit('roomUpdate', room);
      });

      this.socket.on('gameUpdate', (gameState) => {
        this.emit('gameUpdate', gameState);
      });

      this.socket.on('error', (message) => {
        this.emit('error', message);
      });

      this.socket.on('playerDisconnected', (playerId) => {
        this.emit('playerDisconnected', playerId);
      });

      this.socket.on('playerReconnected', (playerId) => {
        this.emit('playerReconnected', playerId);
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Event emitter methods
  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((cb) => cb(...args));
  }

  // Game actions
  createRoom(playerName: string): Promise<{ success: boolean; roomCode?: string; error?: string }> {
    return new Promise((resolve) => {
      this.socket?.emit('createRoom', playerName, resolve);
    });
  }

  joinRoom(roomCode: string, playerName: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.socket?.emit('joinRoom', roomCode, playerName, resolve);
    });
  }

  leaveRoom(): void {
    this.socket?.emit('leaveRoom');
  }

  setMaxPlayers(maxPlayers: number): void {
    this.socket?.emit('setMaxPlayers', maxPlayers);
  }

  startGame(): void {
    this.socket?.emit('startGame');
  }

  // Setup phase
  placeInitialSettlement(vertexId: string): void {
    this.socket?.emit('placeInitialSettlement', vertexId);
  }

  placeInitialRoad(edgeId: string): void {
    this.socket?.emit('placeInitialRoad', edgeId);
  }

  // Normal gameplay
  rollDice(): void {
    this.socket?.emit('rollDice');
  }

  buildRoad(edgeId: string): void {
    this.socket?.emit('buildRoad', edgeId);
  }

  buildSettlement(vertexId: string): void {
    this.socket?.emit('buildSettlement', vertexId);
  }

  buildCity(vertexId: string): void {
    this.socket?.emit('buildCity', vertexId);
  }

  moveRobber(hexId: string): void {
    this.socket?.emit('moveRobber', hexId);
  }

  stealResource(targetPlayerId: string): void {
    this.socket?.emit('stealResource', targetPlayerId);
  }

  discardResources(resources: Partial<Resources>): void {
    this.socket?.emit('discardResources', resources);
  }

  proposeTrade(offer: { toPlayerId: string | null; offering: Partial<Resources>; requesting: Partial<Resources> }): void {
    this.socket?.emit('proposeTrade', offer);
  }

  respondToTrade(accept: boolean): void {
    this.socket?.emit('respondToTrade', accept);
  }

  cancelTrade(): void {
    this.socket?.emit('cancelTrade');
  }

  bankTrade(giving: Partial<Resources>, receiving: Partial<Resources>): void {
    this.socket?.emit('bankTrade', giving, receiving);
  }

  endTurn(): void {
    this.socket?.emit('endTurn');
  }

  // Development cards
  buyDevCard(): void {
    this.socket?.emit('buyDevCard');
  }

  playKnight(): void {
    this.socket?.emit('playKnight');
  }

  playRoadBuilding(): void {
    this.socket?.emit('playRoadBuilding');
  }

  playYearOfPlenty(resource1: ResourceType, resource2: ResourceType): void {
    this.socket?.emit('playYearOfPlenty', resource1, resource2);
  }

  playMonopoly(resource: ResourceType): void {
    this.socket?.emit('playMonopoly', resource);
  }
}

export const socketService = new SocketService();
