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
  q: number;
  r: number;
  terrain: TerrainType;
  number: number | null;
  hasRobber: boolean;
}

// Harbor on the board
export interface Harbor {
  id: string;
  type: HarborType;
  vertexIds: string[];
  edgePosition: { q: number; r: number; direction: number };
}

// Intersection (vertex) where settlements/cities can be built
export interface Vertex {
  id: string;
  hexIds: string[];
  building: BuildingType | null;
  playerId: string | null;
  harborId: string | null;
  isCoastal: boolean;
  position: { x: number; y: number }; // pixel position for rendering
}

// Edge where roads can be built
export interface Edge {
  id: string;
  vertexIds: [string, string];
  road: boolean;
  playerId: string | null;
}

// Development card
export interface DevCard {
  id: string;
  type: DevCardType;
  boughtThisTurn: boolean;
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
  lastPlacedVertexId: string | null;
}

// Trade offer
export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId: string | null;
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
  discardingPlayerIds: string[];
  longestRoadPlayerId: string | null;
  largestArmyPlayerId: string | null;
  settings: GameSettings;
  setupRound: 1 | 2;
  setupDirection: 'forward' | 'reverse';
  devCardDeck: DevCard[];
  roadBuildingRoadsLeft: number;
  phaseBeforeRobber: 'roll' | 'main' | null;
}

// Game settings
export interface GameSettings {
  maxPlayers: number;
  handLimit: number;
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

// View states
export type ViewState = 'home' | 'lobby' | 'game';

// Dev card display names
export const DEV_CARD_NAMES: Record<DevCardType, string> = {
  knight: 'Knight',
  road_building: 'Road Building',
  year_of_plenty: 'Year of Plenty',
  monopoly: 'Monopoly',
  victory_point: 'Victory Point',
};

// Harbor display names
export const HARBOR_NAMES: Record<HarborType, string> = {
  '3:1': '3:1 Any',
  wood: '2:1 Wood',
  brick: '2:1 Brick',
  sheep: '2:1 Sheep',
  wheat: '2:1 Wheat',
  ore: '2:1 Ore',
};
