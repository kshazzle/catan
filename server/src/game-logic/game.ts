import { v4 as uuid } from 'uuid';
import {
  GameState,
  Player,
  Resources,
  ResourceType,
  PlayerColor,
  LogEntry,
  BUILDING_COSTS,
  BUILDING_LIMITS,
  TradeOffer,
  GameSettings,
  DevCard,
  DevCardType,
  HarborType,
} from '../types';
import {
  generateBoard,
  getAdjacentVertices,
  isEdgeConnectedToPlayer,
  calculateLongestRoad,
  getHexVertices,
  getPlayerHarbors,
  getVertexEdges,
} from './board';

const PLAYER_COLORS: PlayerColor[] = ['blue', 'green', 'coral', 'violet'];

const TERRAIN_TO_RESOURCE: Record<string, ResourceType | null> = {
  wood: 'wood',
  brick: 'brick',
  sheep: 'sheep',
  wheat: 'wheat',
  ore: 'ore',
  desert: null,
};

// Development card distribution (25 total)
const DEV_CARD_DISTRIBUTION: DevCardType[] = [
  // 14 Knights
  ...Array(14).fill('knight'),
  // 5 Victory Points
  ...Array(5).fill('victory_point'),
  // 2 each of progress cards
  'road_building', 'road_building',
  'year_of_plenty', 'year_of_plenty',
  'monopoly', 'monopoly',
];

export function createEmptyResources(): Resources {
  return { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateDevCardDeck(): DevCard[] {
  const shuffled = shuffle(DEV_CARD_DISTRIBUTION);
  return shuffled.map((type) => ({
    id: uuid(),
    type,
    boughtThisTurn: false,
  }));
}

export function createPlayer(id: string, name: string, colorIndex: number): Player {
  return {
    id,
    name,
    color: PLAYER_COLORS[colorIndex % PLAYER_COLORS.length],
    resources: createEmptyResources(),
    victoryPoints: 0,
    roadsBuilt: 0,
    settlementsBuilt: 0,
    citiesBuilt: 0,
    longestRoad: 0,
    connected: true,
    devCards: [],
    knightsPlayed: 0,
    devCardPlayedThisTurn: false,
    setupSettlementsPlaced: 0,
    lastPlacedVertexId: null,
  };
}

export function createGameState(
  roomCode: string,
  playerData: { id: string; name: string }[],
  settings: GameSettings
): GameState {
  const board = generateBoard();
  const players = playerData.map((p, i) => createPlayer(p.id, p.name, i));
  const devCardDeck = generateDevCardDeck();

  return {
    roomCode,
    phase: 'setup_settlement', // Start with setup phase
    players,
    currentPlayerIndex: 0,
    board,
    lastDiceRoll: null,
    tradeOffer: null,
    log: [],
    winnerId: null,
    turnNumber: 0,
    discardingPlayerIds: [],
    longestRoadPlayerId: null,
    largestArmyPlayerId: null,
    settings,
    setupRound: 1,
    setupDirection: 'forward',
    devCardDeck,
    roadBuildingRoadsLeft: 0,
    phaseBeforeRobber: null,
  };
}

export function addLogEntry(
  state: GameState,
  message: string,
  type: LogEntry['type'],
  playerId: string | null = null
): void {
  state.log.push({
    id: uuid(),
    timestamp: Date.now(),
    playerId,
    message,
    type,
  });
  // Keep only last 50 log entries
  if (state.log.length > 50) {
    state.log = state.log.slice(-50);
  }
}

export function getCurrentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

export function getPlayerById(state: GameState, playerId: string): Player | undefined {
  return state.players.find((p) => p.id === playerId);
}

// ============ SETUP PHASE LOGIC ============

export function canPlaceInitialSettlement(state: GameState, playerId: string, vertexId: string): boolean {
  if (state.phase !== 'setup_settlement') return false;
  
  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.id !== playerId) return false;
  
  const vertex = state.board.vertices.find(v => v.id === vertexId);
  if (!vertex || vertex.building) return false;
  
  // Check distance rule: no adjacent settlements
  const adjacentVertices = getAdjacentVertices(state.board, vertexId);
  if (adjacentVertices.some(v => v.building !== null)) return false;
  
  return true;
}

export function placeInitialSettlement(state: GameState, playerId: string, vertexId: string): boolean {
  if (!canPlaceInitialSettlement(state, playerId, vertexId)) return false;
  
  const player = getPlayerById(state, playerId)!;
  const vertex = state.board.vertices.find(v => v.id === vertexId)!;
  
  vertex.building = 'settlement';
  vertex.playerId = playerId;
  player.settlementsBuilt++;
  player.victoryPoints++;
  player.setupSettlementsPlaced++;
  player.lastPlacedVertexId = vertexId;
  
  addLogEntry(state, `${player.name} placed a settlement`, 'build', playerId);
  
  // Move to road placement
  state.phase = 'setup_road';
  
  return true;
}

export function canPlaceInitialRoad(state: GameState, playerId: string, edgeId: string): boolean {
  if (state.phase !== 'setup_road') return false;
  
  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.id !== playerId) return false;
  if (!currentPlayer.lastPlacedVertexId) return false;
  
  const edge = state.board.edges.find(e => e.id === edgeId);
  if (!edge || edge.road) return false;
  
  // Must connect to the just-placed settlement
  if (!edge.vertexIds.includes(currentPlayer.lastPlacedVertexId)) return false;
  
  return true;
}

export function placeInitialRoad(state: GameState, playerId: string, edgeId: string): boolean {
  if (!canPlaceInitialRoad(state, playerId, edgeId)) return false;
  
  const player = getPlayerById(state, playerId)!;
  const edge = state.board.edges.find(e => e.id === edgeId)!;
  
  edge.road = true;
  edge.playerId = playerId;
  player.roadsBuilt++;
  player.lastPlacedVertexId = null;
  
  addLogEntry(state, `${player.name} placed a road`, 'build', playerId);
  
  // Advance to next player in setup
  advanceSetupTurn(state);
  
  return true;
}

function advanceSetupTurn(state: GameState): void {
  const numPlayers = state.players.length;
  
  if (state.setupRound === 1) {
    if (state.setupDirection === 'forward') {
      if (state.currentPlayerIndex < numPlayers - 1) {
        // Move to next player
        state.currentPlayerIndex++;
      } else {
        // Last player in round 1, start reverse direction (same player goes again)
        state.setupDirection = 'reverse';
        state.setupRound = 2;
      }
    }
  } else {
    // Round 2 - reverse direction
    if (state.currentPlayerIndex > 0) {
      state.currentPlayerIndex--;
    } else {
      // Setup complete! Give starting resources and start the game
      giveStartingResources(state);
      state.phase = 'roll';
      state.turnNumber = 1;
      addLogEntry(state, 'Setup complete! Game begins.', 'system', null);
      addLogEntry(state, `${state.players[0].name}'s turn`, 'system', null);
      return;
    }
  }
  
  state.phase = 'setup_settlement';
  const nextPlayer = getCurrentPlayer(state);
  addLogEntry(state, `${nextPlayer.name}'s turn to place`, 'system', null);
}

function giveStartingResources(state: GameState): void {
  // Give resources from second settlement (the one placed in round 2)
  for (const player of state.players) {
    // Find player's settlements
    const settlements = state.board.vertices.filter(
      v => v.playerId === player.id && v.building === 'settlement'
    );
    
    // The second settlement is the one we give resources for
    // It's placed after the first, so we find it by checking which one
    // has adjacent hexes that we should give resources from
    // In practice, we give resources from the second-placed settlement
    // which is the last one in the list for this player
    if (settlements.length >= 2) {
      const secondSettlement = settlements[settlements.length - 1];
      
      for (const hexId of secondSettlement.hexIds) {
        const hex = state.board.hexes.find(h => h.id === hexId);
        if (hex && hex.terrain !== 'desert') {
          const resource = TERRAIN_TO_RESOURCE[hex.terrain];
          if (resource) {
            player.resources[resource]++;
          }
        }
      }
    }
  }
  
  addLogEntry(state, 'Starting resources distributed', 'system', null);
}

// ============ DICE AND RESOURCES ============

export function rollDice(state: GameState): [number, number] {
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  state.lastDiceRoll = [die1, die2];
  return [die1, die2];
}

export function distributeResources(state: GameState, diceTotal: number): void {
  const { board, players } = state;

  for (const hex of board.hexes) {
    if (hex.number !== diceTotal || hex.hasRobber) continue;

    const resource = TERRAIN_TO_RESOURCE[hex.terrain];
    if (!resource) continue;

    // Find all vertices adjacent to this hex with buildings
    const vertices = getHexVertices(board, hex.id);
    for (const vertex of vertices) {
      if (vertex.playerId && vertex.building) {
        const player = players.find((p) => p.id === vertex.playerId);
        if (player) {
          const amount = vertex.building === 'city' ? 2 : 1;
          player.resources[resource] += amount;
        }
      }
    }
  }
}

export function hasResources(player: Player, cost: Partial<Record<ResourceType, number>>): boolean {
  for (const [resource, amount] of Object.entries(cost)) {
    if ((player.resources[resource as ResourceType] || 0) < (amount || 0)) {
      return false;
    }
  }
  return true;
}

export function deductResources(player: Player, cost: Partial<Record<ResourceType, number>>): void {
  for (const [resource, amount] of Object.entries(cost)) {
    player.resources[resource as ResourceType] -= amount || 0;
  }
}

export function addResources(player: Player, resources: Partial<Record<ResourceType, number>>): void {
  for (const [resource, amount] of Object.entries(resources)) {
    player.resources[resource as ResourceType] += amount || 0;
  }
}

export function getTotalResources(player: Player): number {
  return Object.values(player.resources).reduce((sum, count) => sum + count, 0);
}

// ============ BUILDING ============

export function canBuildRoad(state: GameState, playerId: string, edgeId: string, free: boolean = false): boolean {
  const player = getPlayerById(state, playerId);
  if (!player) return false;
  
  // Check building limit
  if (player.roadsBuilt >= BUILDING_LIMITS.roads) return false;

  const edge = state.board.edges.find((e) => e.id === edgeId);
  if (!edge || edge.road) return false;

  if (!free && !hasResources(player, BUILDING_COSTS.road)) return false;

  return isEdgeConnectedToPlayer(state.board, edgeId, playerId);
}

export function buildRoad(state: GameState, playerId: string, edgeId: string, free: boolean = false): boolean {
  if (!canBuildRoad(state, playerId, edgeId, free)) return false;

  const player = getPlayerById(state, playerId)!;
  const edge = state.board.edges.find((e) => e.id === edgeId)!;

  if (!free) {
    deductResources(player, BUILDING_COSTS.road);
  }
  edge.road = true;
  edge.playerId = playerId;
  player.roadsBuilt++;

  // Update longest road
  player.longestRoad = calculateLongestRoad(state.board, playerId);
  updateLongestRoadBonus(state);

  addLogEntry(state, `${player.name} built a road`, 'build', playerId);
  return true;
}

export function canBuildSettlement(state: GameState, playerId: string, vertexId: string): boolean {
  const player = getPlayerById(state, playerId);
  if (!player) return false;
  
  // Check building limit
  if (player.settlementsBuilt >= BUILDING_LIMITS.settlements) return false;

  const vertex = state.board.vertices.find((v) => v.id === vertexId);
  if (!vertex || vertex.building) return false;

  if (!hasResources(player, BUILDING_COSTS.settlement)) return false;

  // Check distance rule: no adjacent settlements
  const adjacentVertices = getAdjacentVertices(state.board, vertexId);
  if (adjacentVertices.some((v) => v.building !== null)) return false;

  // Must be connected to player's network (road)
  const connectedEdges = state.board.edges.filter(
    (e) => e.vertexIds.includes(vertexId) && e.road && e.playerId === playerId
  );

  if (connectedEdges.length === 0) {
    return false;
  }

  return true;
}

export function buildSettlement(state: GameState, playerId: string, vertexId: string): boolean {
  if (!canBuildSettlement(state, playerId, vertexId)) return false;

  const player = getPlayerById(state, playerId)!;
  const vertex = state.board.vertices.find((v) => v.id === vertexId)!;

  deductResources(player, BUILDING_COSTS.settlement);
  vertex.building = 'settlement';
  vertex.playerId = playerId;
  player.settlementsBuilt++;
  player.victoryPoints++;

  addLogEntry(state, `${player.name} built a settlement`, 'build', playerId);
  checkVictory(state);
  return true;
}

export function canBuildCity(state: GameState, playerId: string, vertexId: string): boolean {
  const player = getPlayerById(state, playerId);
  if (!player) return false;
  
  // Check building limit
  if (player.citiesBuilt >= BUILDING_LIMITS.cities) return false;

  const vertex = state.board.vertices.find((v) => v.id === vertexId);
  if (!vertex) return false;

  // Must have a settlement here owned by the player
  if (vertex.building !== 'settlement' || vertex.playerId !== playerId) return false;

  return hasResources(player, BUILDING_COSTS.city);
}

export function buildCity(state: GameState, playerId: string, vertexId: string): boolean {
  if (!canBuildCity(state, playerId, vertexId)) return false;

  const player = getPlayerById(state, playerId)!;
  const vertex = state.board.vertices.find((v) => v.id === vertexId)!;

  deductResources(player, BUILDING_COSTS.city);
  vertex.building = 'city';
  player.settlementsBuilt--;
  player.citiesBuilt++;
  player.victoryPoints++; // Net +1 (city is 2 VP, replacing 1 VP settlement)

  addLogEntry(state, `${player.name} built a city`, 'build', playerId);
  checkVictory(state);
  return true;
}

// ============ ROBBER ============

export function moveRobber(state: GameState, hexId: string): boolean {
  const hex = state.board.hexes.find((h) => h.id === hexId);
  if (!hex) return false;

  // Remove robber from current location
  const currentRobberHex = state.board.hexes.find((h) => h.hasRobber);
  if (currentRobberHex) {
    currentRobberHex.hasRobber = false;
  }

  hex.hasRobber = true;

  const player = getCurrentPlayer(state);
  addLogEntry(state, `${player.name} moved the robber`, 'robber', player.id);

  return true;
}

export function getPlayersToStealFrom(state: GameState, hexId: string): Player[] {
  const currentPlayer = getCurrentPlayer(state);
  const vertices = getHexVertices(state.board, hexId);

  const playerIds = new Set<string>();
  for (const vertex of vertices) {
    if (vertex.playerId && vertex.playerId !== currentPlayer.id) {
      const player = getPlayerById(state, vertex.playerId);
      if (player && getTotalResources(player) > 0) {
        playerIds.add(vertex.playerId);
      }
    }
  }

  return state.players.filter((p) => playerIds.has(p.id));
}

export function stealResource(state: GameState, targetPlayerId: string): ResourceType | null {
  const currentPlayer = getCurrentPlayer(state);
  const targetPlayer = getPlayerById(state, targetPlayerId);

  if (!targetPlayer) return null;

  const totalResources = getTotalResources(targetPlayer);
  if (totalResources === 0) return null;

  // Pick a random resource
  const resourceTypes: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
  const availableResources: ResourceType[] = [];

  for (const type of resourceTypes) {
    for (let i = 0; i < targetPlayer.resources[type]; i++) {
      availableResources.push(type);
    }
  }

  const stolenResource = availableResources[Math.floor(Math.random() * availableResources.length)];

  targetPlayer.resources[stolenResource]--;
  currentPlayer.resources[stolenResource]++;

  addLogEntry(
    state,
    `${currentPlayer.name} stole a resource from ${targetPlayer.name}`,
    'robber',
    currentPlayer.id
  );

  return stolenResource;
}

export function getPlayersToDiscard(state: GameState): Player[] {
  return state.players.filter((p) => getTotalResources(p) > state.settings.handLimit);
}

export function discardHalfResources(
  state: GameState,
  playerId: string,
  resources: Partial<Resources>
): boolean {
  const player = getPlayerById(state, playerId);
  if (!player) return false;

  const totalToDiscard = Math.floor(getTotalResources(player) / 2);
  const discarding = Object.values(resources).reduce((sum, n) => sum + (n || 0), 0);

  if (discarding !== totalToDiscard) return false;

  // Check player has the resources
  for (const [resource, amount] of Object.entries(resources)) {
    if ((player.resources[resource as ResourceType] || 0) < (amount || 0)) {
      return false;
    }
  }

  deductResources(player, resources);

  addLogEntry(state, `${player.name} discarded ${totalToDiscard} cards`, 'robber', playerId);

  // Remove from discarding list
  state.discardingPlayerIds = state.discardingPlayerIds.filter((id) => id !== playerId);

  return true;
}

// ============ LONGEST ROAD & LARGEST ARMY ============

export function updateLongestRoadBonus(state: GameState): void {
  let maxLength = 4; // Minimum 5 roads needed
  let leaderId: string | null = null;

  for (const player of state.players) {
    if (player.longestRoad > maxLength) {
      maxLength = player.longestRoad;
      leaderId = player.id;
    }
  }

  // Remove bonus from previous holder
  if (state.longestRoadPlayerId && state.longestRoadPlayerId !== leaderId) {
    const prevHolder = getPlayerById(state, state.longestRoadPlayerId);
    if (prevHolder) {
      prevHolder.victoryPoints -= 2;
    }
  }

  // Add bonus to new holder
  if (leaderId && leaderId !== state.longestRoadPlayerId) {
    const newHolder = getPlayerById(state, leaderId);
    if (newHolder) {
      newHolder.victoryPoints += 2;
      addLogEntry(state, `${newHolder.name} has the Longest Road!`, 'victory', leaderId);
    }
  }

  state.longestRoadPlayerId = leaderId;
}

export function updateLargestArmyBonus(state: GameState): void {
  let maxKnights = 2; // Minimum 3 knights needed
  let leaderId: string | null = null;

  for (const player of state.players) {
    if (player.knightsPlayed > maxKnights) {
      maxKnights = player.knightsPlayed;
      leaderId = player.id;
    }
  }

  // Remove bonus from previous holder
  if (state.largestArmyPlayerId && state.largestArmyPlayerId !== leaderId) {
    const prevHolder = getPlayerById(state, state.largestArmyPlayerId);
    if (prevHolder) {
      prevHolder.victoryPoints -= 2;
    }
  }

  // Add bonus to new holder
  if (leaderId && leaderId !== state.largestArmyPlayerId) {
    const newHolder = getPlayerById(state, leaderId);
    if (newHolder) {
      newHolder.victoryPoints += 2;
      addLogEntry(state, `${newHolder.name} has the Largest Army!`, 'victory', leaderId);
    }
  }

  state.largestArmyPlayerId = leaderId;
}

export function checkVictory(state: GameState): void {
  for (const player of state.players) {
    // Count hidden VP cards
    const hiddenVP = player.devCards.filter(c => c.type === 'victory_point').length;
    const totalVP = player.victoryPoints + hiddenVP;
    
    if (totalVP >= state.settings.victoryPointsToWin) {
      // Reveal VP cards
      player.victoryPoints += hiddenVP;
      state.winnerId = player.id;
      state.phase = 'ended';
      addLogEntry(state, `${player.name} wins the game with ${totalVP} victory points!`, 'victory', player.id);
      return;
    }
  }
}

// ============ TRADING ============

export function getPlayerTradeRatios(state: GameState, playerId: string): Record<ResourceType, number> {
  const defaultRatio: Record<ResourceType, number> = {
    wood: 4,
    brick: 4,
    sheep: 4,
    wheat: 4,
    ore: 4,
  };
  
  const harbors = getPlayerHarbors(state.board, playerId);
  
  for (const harbor of harbors) {
    if (harbor.type === '3:1') {
      // 3:1 for all resources
      for (const resource of Object.keys(defaultRatio) as ResourceType[]) {
        if (defaultRatio[resource] > 3) {
          defaultRatio[resource] = 3;
        }
      }
    } else {
      // 2:1 for specific resource
      const resource = harbor.type as ResourceType;
      if (defaultRatio[resource] > 2) {
        defaultRatio[resource] = 2;
      }
    }
  }
  
  return defaultRatio;
}

export function bankTrade(
  state: GameState,
  playerId: string,
  giving: Partial<Resources>,
  receiving: Partial<Resources>
): boolean {
  const player = getPlayerById(state, playerId);
  if (!player) return false;

  const ratios = getPlayerTradeRatios(state, playerId);
  
  // Calculate what they're giving
  let totalGiving = 0;
  let totalReceiving = 0;
  
  for (const [resource, amount] of Object.entries(receiving)) {
    if (amount && amount > 0) {
      totalReceiving += amount;
    }
  }
  
  // Validate the trade based on ratios
  for (const [resource, amount] of Object.entries(giving)) {
    if (amount && amount > 0) {
      const ratio = ratios[resource as ResourceType];
      // Each 'ratio' cards of this resource = 1 receiving card
      totalGiving += amount / ratio;
    }
  }
  
  // The giving total should equal receiving total
  if (Math.abs(totalGiving - totalReceiving) > 0.001) return false;
  
  if (!hasResources(player, giving)) return false;

  deductResources(player, giving);
  addResources(player, receiving);

  addLogEntry(state, `${player.name} traded with the bank`, 'trade', playerId);
  return true;
}

export function createTradeOffer(
  state: GameState,
  fromPlayerId: string,
  toPlayerId: string | null,
  offering: Partial<Resources>,
  requesting: Partial<Resources>
): TradeOffer | null {
  const fromPlayer = getPlayerById(state, fromPlayerId);
  if (!fromPlayer) return null;

  // Check player has the resources to offer
  if (!hasResources(fromPlayer, offering)) return null;

  const offer: TradeOffer = {
    id: uuid(),
    fromPlayerId,
    toPlayerId,
    offering,
    requesting,
    status: 'pending',
  };

  state.tradeOffer = offer;
  return offer;
}

export function acceptTrade(state: GameState): boolean {
  const offer = state.tradeOffer;
  if (!offer || offer.status !== 'pending') return false;

  const fromPlayer = getPlayerById(state, offer.fromPlayerId);
  const toPlayer = offer.toPlayerId ? getPlayerById(state, offer.toPlayerId) : null;

  if (!fromPlayer) return false;

  if (toPlayer) {
    // Player-to-player trade
    if (!hasResources(toPlayer, offer.requesting)) return false;
    if (!hasResources(fromPlayer, offer.offering)) return false;

    deductResources(fromPlayer, offer.offering);
    addResources(fromPlayer, offer.requesting);
    deductResources(toPlayer, offer.requesting);
    addResources(toPlayer, offer.offering);

    addLogEntry(
      state,
      `${fromPlayer.name} traded with ${toPlayer.name}`,
      'trade',
      fromPlayer.id
    );
  }

  offer.status = 'accepted';
  state.tradeOffer = null;
  return true;
}

// ============ DEVELOPMENT CARDS ============

export function canBuyDevCard(state: GameState, playerId: string): boolean {
  const player = getPlayerById(state, playerId);
  if (!player) return false;
  if (state.devCardDeck.length === 0) return false;
  return hasResources(player, BUILDING_COSTS.devCard);
}

export function buyDevCard(state: GameState, playerId: string): DevCard | null {
  if (!canBuyDevCard(state, playerId)) return null;
  
  const player = getPlayerById(state, playerId)!;
  deductResources(player, BUILDING_COSTS.devCard);
  
  const card = state.devCardDeck.pop()!;
  card.boughtThisTurn = true;
  player.devCards.push(card);
  
  addLogEntry(state, `${player.name} bought a development card`, 'devcard', playerId);
  
  // Check for victory (in case it's a VP card)
  checkVictory(state);
  
  return card;
}

export function canPlayDevCard(state: GameState, playerId: string, cardType: DevCardType): boolean {
  const player = getPlayerById(state, playerId);
  if (!player) return false;
  
  // Can only play one dev card per turn (except VP cards which are revealed, not played)
  if (player.devCardPlayedThisTurn && cardType !== 'victory_point') return false;
  
  // Find a card of this type that wasn't bought this turn
  const card = player.devCards.find(c => c.type === cardType && !c.boughtThisTurn);
  if (!card) return false;
  
  // VP cards are never "played" - they're revealed at end of game
  if (cardType === 'victory_point') return false;
  
  return true;
}

export function playKnight(state: GameState, playerId: string): boolean {
  if (!canPlayDevCard(state, playerId, 'knight')) return false;
  
  const player = getPlayerById(state, playerId)!;
  
  // Remove the card
  const cardIndex = player.devCards.findIndex(c => c.type === 'knight' && !c.boughtThisTurn);
  player.devCards.splice(cardIndex, 1);
  
  player.knightsPlayed++;
  player.devCardPlayedThisTurn = true;
  
  // Check for largest army
  updateLargestArmyBonus(state);
  
  addLogEntry(state, `${player.name} played a Knight`, 'devcard', playerId);
  
  // Save current phase so we can return to it after robber is moved
  // If played during 'roll' phase, return to 'roll' after
  // If played during 'main' phase, return to 'main' after
  state.phaseBeforeRobber = state.phase === 'roll' ? 'roll' : 'main';
  
  // Move to robber phase
  state.phase = 'robber_move';
  
  return true;
}

export function playRoadBuilding(state: GameState, playerId: string): boolean {
  if (!canPlayDevCard(state, playerId, 'road_building')) return false;
  
  const player = getPlayerById(state, playerId)!;
  
  // Remove the card
  const cardIndex = player.devCards.findIndex(c => c.type === 'road_building' && !c.boughtThisTurn);
  player.devCards.splice(cardIndex, 1);
  
  player.devCardPlayedThisTurn = true;
  state.roadBuildingRoadsLeft = 2;
  state.phase = 'road_building';
  
  addLogEntry(state, `${player.name} played Road Building`, 'devcard', playerId);
  
  return true;
}

export function playYearOfPlenty(state: GameState, playerId: string, resource1: ResourceType, resource2: ResourceType): boolean {
  if (!canPlayDevCard(state, playerId, 'year_of_plenty')) return false;
  
  const player = getPlayerById(state, playerId)!;
  
  // Remove the card
  const cardIndex = player.devCards.findIndex(c => c.type === 'year_of_plenty' && !c.boughtThisTurn);
  player.devCards.splice(cardIndex, 1);
  
  player.devCardPlayedThisTurn = true;
  
  // Give 2 resources
  player.resources[resource1]++;
  player.resources[resource2]++;
  
  addLogEntry(state, `${player.name} played Year of Plenty`, 'devcard', playerId);
  
  return true;
}

export function playMonopoly(state: GameState, playerId: string, resource: ResourceType): boolean {
  if (!canPlayDevCard(state, playerId, 'monopoly')) return false;
  
  const player = getPlayerById(state, playerId)!;
  
  // Remove the card
  const cardIndex = player.devCards.findIndex(c => c.type === 'monopoly' && !c.boughtThisTurn);
  player.devCards.splice(cardIndex, 1);
  
  player.devCardPlayedThisTurn = true;
  
  // Steal all of one resource from all players
  let stolen = 0;
  for (const otherPlayer of state.players) {
    if (otherPlayer.id !== playerId) {
      const amount = otherPlayer.resources[resource];
      otherPlayer.resources[resource] = 0;
      stolen += amount;
    }
  }
  player.resources[resource] += stolen;
  
  addLogEntry(state, `${player.name} played Monopoly and took ${stolen} ${resource}`, 'devcard', playerId);
  
  return true;
}

export function buildRoadFromRoadBuilding(state: GameState, playerId: string, edgeId: string): boolean {
  if (state.phase !== 'road_building') return false;
  if (state.roadBuildingRoadsLeft <= 0) return false;
  
  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.id !== playerId) return false;
  
  if (!buildRoad(state, playerId, edgeId, true)) return false;
  
  state.roadBuildingRoadsLeft--;
  
  if (state.roadBuildingRoadsLeft === 0) {
    state.phase = 'main';
  }
  
  return true;
}

// ============ TURN MANAGEMENT ============

export function endTurn(state: GameState): void {
  const currentPlayer = getCurrentPlayer(state);
  
  // Reset dev card flags for next turn
  currentPlayer.devCardPlayedThisTurn = false;
  for (const card of currentPlayer.devCards) {
    card.boughtThisTurn = false;
  }
  
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.phase = 'roll';
  state.tradeOffer = null;
  state.turnNumber++;

  const nextPlayer = getCurrentPlayer(state);
  addLogEntry(state, `${nextPlayer.name}'s turn`, 'system', null);
}

// ============ VALID LOCATIONS ============

export function getValidSettlementLocations(state: GameState, playerId: string): string[] {
  return state.board.vertices
    .filter((v) => canBuildSettlement(state, playerId, v.id))
    .map((v) => v.id);
}

export function getValidRoadLocations(state: GameState, playerId: string): string[] {
  return state.board.edges
    .filter((e) => canBuildRoad(state, playerId, e.id))
    .map((e) => e.id);
}

export function getValidCityLocations(state: GameState, playerId: string): string[] {
  return state.board.vertices
    .filter((v) => canBuildCity(state, playerId, v.id))
    .map((v) => v.id);
}

export function getValidInitialSettlementLocations(state: GameState, playerId: string): string[] {
  return state.board.vertices
    .filter((v) => canPlaceInitialSettlement(state, playerId, v.id))
    .map((v) => v.id);
}

export function getValidInitialRoadLocations(state: GameState, playerId: string): string[] {
  return state.board.edges
    .filter((e) => canPlaceInitialRoad(state, playerId, e.id))
    .map((e) => e.id);
}
