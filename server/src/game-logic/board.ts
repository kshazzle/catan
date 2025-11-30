import { v4 as uuid } from 'uuid';
import { Board, HexTile, Vertex, Edge, TerrainType, Harbor, HarborType } from '../types';

// Standard hex coordinates for a Catan-style board (19 hexes)
const HEX_COORDS: [number, number][] = [
  // Center
  [0, 0],
  // First ring
  [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1],
  // Second ring
  [2, -2], [2, -1], [2, 0], [1, 1], [0, 2], [-1, 2],
  [-2, 2], [-2, 1], [-2, 0], [-1, -1], [0, -2], [1, -2],
];

// Terrain distribution (standard Catan)
const TERRAIN_DISTRIBUTION: TerrainType[] = [
  'wood', 'wood', 'wood', 'wood',
  'sheep', 'sheep', 'sheep', 'sheep',
  'wheat', 'wheat', 'wheat', 'wheat',
  'brick', 'brick', 'brick',
  'ore', 'ore', 'ore',
  'desert',
];

// Number token distribution (avoiding 6 and 8 on adjacent tiles when possible)
const NUMBER_DISTRIBUTION: number[] = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
];

// Harbor distribution - FIXED layout matching standard Catan board
// Order matches HARBOR_EDGE_POSITIONS (clockwise from top)
const HARBOR_TYPES: HarborType[] = [
  '3:1',    // Top
  'wheat',  // Top-right upper
  'ore',    // Top-right lower  
  '3:1',    // Right upper
  'sheep',  // Right lower (near desert area)
  '3:1',    // Bottom
  '3:1',    // Bottom-left
  'brick',  // Left upper
  'wood',   // Top-left
];

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Hex size for position calculations (must match client)
const HEX_SIZE = 50;

// Convert axial coordinates to pixel (pointy-top hex)
function axialToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * Math.sqrt(3) * (q + r / 2);
  const y = HEX_SIZE * (3 / 2) * r;
  return { x, y };
}

// Get the 6 corner positions of a hex (pointy-top orientation)
// Corners go clockwise starting from the top
function getHexCorners(q: number, r: number): { x: number; y: number }[] {
  const center = axialToPixel(q, r);
  const corners: { x: number; y: number }[] = [];
  
  // For pointy-top hex, corners are at angles: 270, 330, 30, 90, 150, 210 (clockwise from top)
  // Or equivalently: -90, -30, 30, 90, 150, 210
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 90; // Start from top (270° = -90°)
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: Math.round((center.x + HEX_SIZE * Math.cos(angleRad)) * 100) / 100,
      y: Math.round((center.y + HEX_SIZE * Math.sin(angleRad)) * 100) / 100
    });
  }
  return corners;
}

// Create a unique key for a position (for deduplication)
function positionKey(x: number, y: number): string {
  return `${Math.round(x)},${Math.round(y)}`;
}

// Get the 6 edge definitions for a hex (pairs of corner indices)
function getHexEdges(corners: { x: number; y: number }[]): [{ x: number; y: number }, { x: number; y: number }][] {
  const edges: [{ x: number; y: number }, { x: number; y: number }][] = [];
  for (let i = 0; i < 6; i++) {
    edges.push([corners[i], corners[(i + 1) % 6]]);
  }
  return edges;
}

// Create edge key from two positions (sorted for consistency)
function edgeKey(p1: { x: number; y: number }, p2: { x: number; y: number }): string {
  const k1 = positionKey(p1.x, p1.y);
  const k2 = positionKey(p2.x, p2.y);
  return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
}

// Define harbor edge positions around the island (clockwise from top)
// Each entry: [q, r, direction (0-5)] - the hex and which edge the harbor is on
// Direction must point OUTWARD to water (edge with no adjacent hex)
const HARBOR_EDGE_POSITIONS: { q: number; r: number; direction: number }[] = [
  { q: 0, r: -2, direction: 5 },   // Top - NW edge (faces water)
  { q: 1, r: -2, direction: 0 },   // Top-right - NE edge (faces water, not direction 1 which faces hex 2,-2)
  { q: 2, r: -1, direction: 1 },   // Right upper - E edge (faces water)
  { q: 2, r: 0, direction: 2 },    // Right middle - SE edge (faces water)
  { q: 1, r: 1, direction: 2 },    // Right lower - SE edge (faces water)
  { q: 0, r: 2, direction: 3 },    // Bottom - SW edge (faces water)
  { q: -2, r: 2, direction: 4 },   // Bottom-left - W edge (faces water)
  { q: -2, r: 0, direction: 4 },   // Left - W edge (faces water)
  { q: -1, r: -1, direction: 5 },  // Top-left - NW edge (faces water)
];

export function generateBoard(): Board {
  // Shuffle terrains and numbers (harbors stay fixed like official Catan)
  const terrains = shuffle(TERRAIN_DISTRIBUTION);
  const numbers = shuffle(NUMBER_DISTRIBUTION);
  const harborTypes = HARBOR_TYPES; // Fixed layout, no shuffle
  
  let numberIndex = 0;
  
  // Create hex tiles
  const hexes: HexTile[] = HEX_COORDS.map(([q, r], i) => {
    const terrain = terrains[i];
    const isDesert = terrain === 'desert';
    return {
      id: `hex_${q}_${r}`,
      q,
      r,
      terrain,
      number: isDesert ? null : numbers[numberIndex++],
      hasRobber: isDesert, // robber starts on desert
    };
  });
  
  // Build vertex and edge maps using position-based keys
  // Map: positionKey -> { position, hexIds, id }
  const vertexData = new Map<string, { 
    position: { x: number; y: number }; 
    hexIds: string[]; 
    id: string;
  }>();
  
  // Map: edgeKey -> { pos1, pos2 }
  const edgeData = new Map<string, { 
    pos1: { x: number; y: number }; 
    pos2: { x: number; y: number }; 
  }>();
  
  // Process each hex: collect its corners as vertices and its edges
  for (const hex of hexes) {
    const corners = getHexCorners(hex.q, hex.r);
    
    // Register each corner as a vertex
    for (const corner of corners) {
      const key = positionKey(corner.x, corner.y);
      if (!vertexData.has(key)) {
        vertexData.set(key, {
          position: corner,
          hexIds: [],
          id: `v_${uuid().slice(0, 8)}`
        });
      }
      vertexData.get(key)!.hexIds.push(hex.id);
    }
    
    // Register each edge
    const hexEdges = getHexEdges(corners);
    for (const [p1, p2] of hexEdges) {
      const key = edgeKey(p1, p2);
      if (!edgeData.has(key)) {
        edgeData.set(key, { pos1: p1, pos2: p2 });
      }
    }
  }
  
  // Create vertex array
  const vertices: Vertex[] = [];
  const posKeyToVertexId = new Map<string, string>();
  
  for (const [key, data] of vertexData.entries()) {
    posKeyToVertexId.set(key, data.id);
    vertices.push({
      id: data.id,
      hexIds: data.hexIds,
      building: null,
      playerId: null,
      harborId: null,
      isCoastal: data.hexIds.length < 3,
      position: data.position,
    });
  }
  
  // Create edge array
  const edges: Edge[] = [];
  const edgeKeyToId = new Map<string, string>();
  
  for (const [key, data] of edgeData.entries()) {
    const v1Key = positionKey(data.pos1.x, data.pos1.y);
    const v2Key = positionKey(data.pos2.x, data.pos2.y);
    const v1Id = posKeyToVertexId.get(v1Key);
    const v2Id = posKeyToVertexId.get(v2Key);
    
    if (v1Id && v2Id) {
      const id = `e_${uuid().slice(0, 8)}`;
      edgeKeyToId.set(key, id);
      edges.push({
        id,
        vertexIds: [v1Id, v2Id],
        road: false,
        playerId: null,
      });
    }
  }
  
  // Create harbors
  const harbors: Harbor[] = [];
  
  for (let i = 0; i < HARBOR_EDGE_POSITIONS.length; i++) {
    const pos = HARBOR_EDGE_POSITIONS[i];
    const harborType = harborTypes[i];
    
    // Get the hex corners for this position
    const corners = getHexCorners(pos.q, pos.r);
    const c1 = corners[pos.direction];
    const c2 = corners[(pos.direction + 1) % 6];
    
    const v1Key = positionKey(c1.x, c1.y);
    const v2Key = positionKey(c2.x, c2.y);
    const v1Id = posKeyToVertexId.get(v1Key);
    const v2Id = posKeyToVertexId.get(v2Key);
    
    if (v1Id && v2Id) {
      const harborId = `harbor_${uuid().slice(0, 8)}`;
      
      harbors.push({
        id: harborId,
        type: harborType,
        vertexIds: [v1Id, v2Id],
        edgePosition: pos,
      });
      
      // Mark vertices with this harbor
      const v1 = vertices.find(v => v.id === v1Id);
      const v2 = vertices.find(v => v.id === v2Id);
      if (v1) v1.harborId = harborId;
      if (v2) v2.harborId = harborId;
    }
  }
  
  return { hexes, vertices, edges, harbors };
}

// Get adjacent vertices for a given vertex
export function getAdjacentVertices(board: Board, vertexId: string): Vertex[] {
  const adjacentIds = new Set<string>();
  
  for (const edge of board.edges) {
    if (edge.vertexIds[0] === vertexId) {
      adjacentIds.add(edge.vertexIds[1]);
    } else if (edge.vertexIds[1] === vertexId) {
      adjacentIds.add(edge.vertexIds[0]);
    }
  }
  
  return board.vertices.filter(v => adjacentIds.has(v.id));
}

// Get edges connected to a vertex
export function getVertexEdges(board: Board, vertexId: string): Edge[] {
  return board.edges.filter(
    e => e.vertexIds[0] === vertexId || e.vertexIds[1] === vertexId
  );
}

// Get vertices connected by an edge
export function getEdgeVertices(board: Board, edgeId: string): [Vertex, Vertex] | null {
  const edge = board.edges.find(e => e.id === edgeId);
  if (!edge) return null;
  
  const v1 = board.vertices.find(v => v.id === edge.vertexIds[0]);
  const v2 = board.vertices.find(v => v.id === edge.vertexIds[1]);
  
  if (!v1 || !v2) return null;
  return [v1, v2];
}

// Check if a player has a connected road/building at an edge
export function isEdgeConnectedToPlayer(board: Board, edgeId: string, playerId: string): boolean {
  const vertices = getEdgeVertices(board, edgeId);
  if (!vertices) return false;
  
  const [v1, v2] = vertices;
  
  // Check if player has a building at either end
  if ((v1.playerId === playerId) || (v2.playerId === playerId)) {
    return true;
  }
  
  // Check if player has a road connected to either end
  for (const vertex of [v1, v2]) {
    const connectedEdges = getVertexEdges(board, vertex.id);
    for (const edge of connectedEdges) {
      if (edge.road && edge.playerId === playerId) {
        return true;
      }
    }
  }
  
  return false;
}

// Calculate longest road for a player
export function calculateLongestRoad(board: Board, playerId: string): number {
  const playerEdges = board.edges.filter(e => e.road && e.playerId === playerId);
  if (playerEdges.length === 0) return 0;
  
  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  
  for (const edge of playerEdges) {
    for (const vertexId of edge.vertexIds) {
      // Check if opponent has a building here (breaks the road)
      const vertex = board.vertices.find(v => v.id === vertexId);
      if (vertex?.playerId && vertex.playerId !== playerId) {
        continue; // Skip this vertex as it breaks the chain
      }
      
      if (!adjacency.has(edge.id)) {
        adjacency.set(edge.id, new Set());
      }
      
      // Find other edges connected via this vertex
      for (const otherEdge of playerEdges) {
        if (otherEdge.id !== edge.id && otherEdge.vertexIds.includes(vertexId)) {
          adjacency.get(edge.id)!.add(otherEdge.id);
        }
      }
    }
  }
  
  // DFS to find longest path
  let maxLength = 0;
  
  function dfs(edgeId: string, visited: Set<string>): number {
    visited.add(edgeId);
    let max = 0;
    
    const neighbors = adjacency.get(edgeId) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        max = Math.max(max, dfs(neighbor, new Set(visited)));
      }
    }
    
    return 1 + max;
  }
  
  for (const edge of playerEdges) {
    const length = dfs(edge.id, new Set());
    maxLength = Math.max(maxLength, length);
  }
  
  return maxLength;
}

// Get hex by coordinates
export function getHexAt(board: Board, q: number, r: number): HexTile | undefined {
  return board.hexes.find(h => h.q === q && h.r === r);
}

// Get vertices adjacent to a hex
export function getHexVertices(board: Board, hexId: string): Vertex[] {
  return board.vertices.filter(v => v.hexIds.includes(hexId));
}

// Get harbor for a vertex if it has one
export function getVertexHarbor(board: Board, vertexId: string): Harbor | null {
  const vertex = board.vertices.find(v => v.id === vertexId);
  if (!vertex?.harborId) return null;
  return board.harbors.find(h => h.id === vertex.harborId) || null;
}

// Get all harbors a player has access to (via settlements/cities)
export function getPlayerHarbors(board: Board, playerId: string): Harbor[] {
  const playerVertices = board.vertices.filter(
    v => v.playerId === playerId && v.building
  );
  
  const harborIds = new Set<string>();
  for (const vertex of playerVertices) {
    if (vertex.harborId) {
      harborIds.add(vertex.harborId);
    }
  }
  
  return board.harbors.filter(h => harborIds.has(h.id));
}
