// Resource types
export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore';

// Terrain types for hex tiles
export type TerrainType = ResourceType | 'desert';

// Player colors
export type PlayerColor = 'blue' | 'green' | 'coral' | 'violet';

// Building types
export type BuildingType = 'settlement' | 'city';

// Game phases
export type GamePhase = 
  | 'waiting'
  | 'setup_settlement'  // placing initial settlement
  | 'setup_road'        // placing initial road after settlement
  | 'roll'
  | 'robber_discard'
  | 'robber_move'
  | 'robber_steal'
  | 'main'
  | 'trade'
  | 'road_building'     // playing road building dev card (place 2 roads)
  | 'ended';

// Harbor types for trading
export type HarborType = '3:1' | 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore';

// Development card types
export type DevCardType = 'knight' | 'road_building' | 'year_of_plenty' | 'monopoly' | 'victory_point';

// Resource costs for buildings
export const BUILDING_COSTS: Record<string, Partial<Record<ResourceType, number>>> = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city: { wheat: 2, ore: 3 },
  devCard: { sheep: 1, wheat: 1, ore: 1 },
};

// Building limits per player
export const BUILDING_LIMITS = {
  roads: 15,
  settlements: 5,
  cities: 4,
};

// Hex tile on the board
export interface HexTile {
  id: string;
  q: number; // axial coordinate
  r: number; // axial coordinate
  terrain: TerrainType;
  number: number | null; // dice number (null for desert)
  hasRobber: boolean;
}

// Harbor on the board
export interface Harbor {
  id: string;
  type: HarborType;
  vertexIds: string[]; // vertices that can access this harbor
  edgePosition: { q: number; r: number; direction: number }; // for rendering
}

// Intersection (vertex) where settlements/cities can be built
export interface Vertex {
  id: string;
  hexIds: string[]; // adjacent hex tiles
  building: BuildingType | null;
  playerId: string | null;
  harborId: string | null; // reference to harbor if on coast
  isCoastal: boolean;
  position: { x: number; y: number }; // pixel position for rendering
}

// Edge where roads can be built
export interface Edge {
  id: string;
  vertexIds: [string, string]; // connected vertices
  road: boolean;
  playerId: string | null;
}

// Development card
export interface DevCard {
  id: string;
  type: DevCardType;
  boughtThisTurn: boolean; // can't play on same turn it was bought
}

// Player resources
export interface Resources {
  wood: number;
  brick: number;
  sheep: number;
  wheat: number;
  ore: number;
}

// Player state
export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  resources: Resources;
  victoryPoints: number;
  roadsBuilt: number;
  settlementsBuilt: number;
  citiesBuilt: number;
  longestRoad: number;
  connected: boolean;
  // Development cards
  devCards: DevCard[];
  knightsPlayed: number;
  devCardPlayedThisTurn: boolean;
  // Setup tracking
  setupSettlementsPlaced: number;
  lastPlacedVertexId: string | null; // for setup road placement
}

// Trade offer
export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId: string | null; // null for bank trade
  offering: Partial<Resources>;
  requesting: Partial<Resources>;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
}

// Game log entry
export interface LogEntry {
  id: string;
  timestamp: number;
  playerId: string | null;
  message: string;
  type: 'roll' | 'build' | 'trade' | 'robber' | 'system' | 'victory' | 'devcard';
}

// Board state
export interface Board {
  hexes: HexTile[];
  vertices: Vertex[];
  edges: Edge[];
  harbors: Harbor[];
}

// Complete game state
export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  board: Board;
  lastDiceRoll: [number, number] | null;
  tradeOffer: TradeOffer | null;
  log: LogEntry[];
  winnerId: string | null;
  turnNumber: number;
  discardingPlayerIds: string[]; // players who need to discard
  longestRoadPlayerId: string | null;
  largestArmyPlayerId: string | null;
  settings: GameSettings;
  // Setup phase tracking
  setupRound: 1 | 2;
  setupDirection: 'forward' | 'reverse';
  // Development cards
  devCardDeck: DevCard[];
  // Road building card tracking
  roadBuildingRoadsLeft: number;
  // Track phase before robber (for returning after knight card)
  phaseBeforeRobber: 'roll' | 'main' | null;
}

// Game settings
export interface GameSettings {
  maxPlayers: number;
  handLimit: number; // cards before discard on 7
  victoryPointsToWin: number;
}

// Room state (pre-game)
export interface Room {
  code: string;
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  started: boolean;
  gameState: GameState | null;
}

// Player in lobby
export interface RoomPlayer {
  id: string;
  name: string;
  color: PlayerColor;
  ready: boolean;
}

// Socket events from client to server
export interface ClientToServerEvents {
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
  proposeTrade: (offer: Omit<TradeOffer, 'id' | 'status' | 'fromPlayerId'>) => void;
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

// Socket events from server to client
export interface ServerToClientEvents {
  roomUpdate: (room: Room) => void;
  gameUpdate: (gameState: GameState) => void;
  error: (message: string) => void;
  playerDisconnected: (playerId: string) => void;
  playerReconnected: (playerId: string) => void;
}
