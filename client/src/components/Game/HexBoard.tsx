import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { socketService } from '../../services/socket';
import { HexTile, Vertex, Edge, TerrainType, PlayerColor, Harbor, HarborType } from '../../types';
import './HexBoard.css';

// Hex dimensions
const HEX_SIZE = 50;

// Terrain colors - more natural/muted like the reference
const TERRAIN_COLORS: Record<TerrainType, string> = {
  wood: '#2d5a27',      // Forest green
  brick: '#8b4513',     // Saddle brown/clay
  sheep: '#90b84b',     // Light meadow green  
  wheat: '#daa520',     // Golden wheat
  ore: '#696969',       // Gray mountains
  desert: '#d2b48c',    // Tan/sand
};

const TERRAIN_ICONS: Record<TerrainType, string> = {
  wood: '🌲',
  brick: '🏠',
  sheep: '🐑',
  wheat: '🌾',
  ore: '🏔️',
  desert: '',
};

const PLAYER_COLORS: Record<PlayerColor, string> = {
  blue: '#1e90ff',      // Dodger blue
  green: '#228b22',     // Forest green  
  coral: '#ff6347',     // Tomato/red
  violet: '#9370db',    // Medium purple
};

const HARBOR_ICONS: Record<HarborType, string> = {
  '3:1': '⚓',
  wood: '🌲',
  brick: '🧱',
  sheep: '🐑',
  wheat: '🌾',
  ore: '⛰️',
};

// Convert axial coordinates to pixel (pointy-top hex orientation)
function axialToPixel(q: number, r: number): { x: number; y: number } {
  // Pointy-top hex formula
  const x = HEX_SIZE * Math.sqrt(3) * (q + r / 2);
  const y = HEX_SIZE * (3 / 2) * r;
  return { x, y };
}

// Get hex points for SVG polygon
function getHexPoints(cx: number, cy: number, scale: number = 1.0): string {
  const points: string[] = [];
  const size = HEX_SIZE * scale;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

// Simple helper to get vertex position - now uses server-provided position
function getVertexPosition(vertex: Vertex): { x: number; y: number } {
  return vertex.position;
}

interface HexTileProps {
  tile: HexTile;
  isRobberTarget: boolean;
  onClick: () => void;
}

// Get probability dots for a number (more dots = more likely)
function getProbabilityDots(num: number): number {
  const probs: Record<number, number> = {
    2: 1, 3: 2, 4: 3, 5: 4, 6: 5,
    8: 5, 9: 4, 10: 3, 11: 2, 12: 1
  };
  return probs[num] || 0;
}

function HexTileComponent({ tile, isRobberTarget, onClick }: HexTileProps) {
  const { x, y } = axialToPixel(tile.q, tile.r);
  const isHighProbability = tile.number === 6 || tile.number === 8;
  const dots = tile.number ? getProbabilityDots(tile.number) : 0;
  
  return (
    <g 
      className={`hex-tile ${isRobberTarget ? 'robber-target' : ''} ${tile.hasRobber ? 'has-robber' : ''}`}
      onClick={onClick}
    >
      {/* Hex fill layer - slightly larger to cover anti-aliasing gaps */}
      <polygon
        points={getHexPoints(x, y, 1.02)}
        fill={TERRAIN_COLORS[tile.terrain]}
      />
      {/* Hex border layer - exact size */}
      <polygon
        points={getHexPoints(x, y, 1.0)}
        fill="none"
        stroke="#4a3f2f"
        strokeWidth="2.5"
      />
      
      {/* Terrain icon */}
      {TERRAIN_ICONS[tile.terrain] && (
        <text
          x={x}
          y={y - 8}
          textAnchor="middle"
          fontSize="22"
          className="terrain-icon"
        >
          {TERRAIN_ICONS[tile.terrain]}
        </text>
      )}
      
      {/* Number token */}
      {tile.number && !tile.hasRobber && (
        <g className={`number-token ${isHighProbability ? 'high-probability' : ''}`}>
          {/* Token circle */}
          <circle
            cx={x}
            cy={y + 12}
            r="16"
            fill={isHighProbability ? '#fff8dc' : '#f5e6c8'}
            stroke={isHighProbability ? '#c41e3a' : '#8b7355'}
            strokeWidth={isHighProbability ? 2.5 : 2}
          />
          {/* Number */}
          <text
            x={x}
            y={y + 10}
            textAnchor="middle"
            fontSize="16"
            fontWeight="bold"
            fontFamily="Georgia, serif"
            fill={isHighProbability ? '#c41e3a' : '#2d2d2d'}
          >
            {tile.number}
          </text>
          {/* Probability dots */}
          <g className="probability-dots">
            {Array.from({ length: dots }).map((_, i) => (
              <circle
                key={i}
                cx={x - ((dots - 1) * 3) / 2 + i * 3}
                cy={y + 22}
                r="1.5"
                fill={isHighProbability ? '#c41e3a' : '#2d2d2d'}
              />
            ))}
          </g>
        </g>
      )}
      
      {/* Robber */}
      {tile.hasRobber && (
        <g className="robber">
          <ellipse cx={x} cy={y + 10} rx="12" ry="18" fill="#2d2d2d" />
          <circle cx={x} cy={y - 2} r="10" fill="#3d3d3d" />
        </g>
      )}
    </g>
  );
}

interface HarborProps {
  harbor: Harbor;
}

function HarborComponent({ harbor, vertices }: HarborProps & { vertices: Vertex[] }) {
  // Get actual vertex positions from the server data
  const v1 = vertices.find(v => v.id === harbor.vertexIds[0]);
  const v2 = vertices.find(v => v.id === harbor.vertexIds[1]);
  
  if (!v1?.position || !v2?.position) return null;
  
  const v1x = v1.position.x;
  const v1y = v1.position.y;
  const v2x = v2.position.x;
  const v2y = v2.position.y;
  
  // Edge midpoint (center between the two vertices)
  const edgeMidX = (v1x + v2x) / 2;
  const edgeMidY = (v1y + v2y) / 2;
  
  // Calculate edge direction vector
  const edgeDx = v2x - v1x;
  const edgeDy = v2y - v1y;
  
  // Perpendicular to edge (rotate 90 degrees)
  let perpX = -edgeDy;
  let perpY = edgeDx;
  
  // Normalize
  const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
  let normPerpX = perpX / perpLen;
  let normPerpY = perpY / perpLen;
  
  // Place port at fixed distance from edge midpoint
  const portDistance = HEX_SIZE * 1.3;
  let portX = edgeMidX + normPerpX * portDistance;
  let portY = edgeMidY + normPerpY * portDistance;
  
  // Verify port is FURTHER from board center than edge midpoint
  // If not, flip direction
  const edgeDistFromCenter = edgeMidX * edgeMidX + edgeMidY * edgeMidY;
  const portDistFromCenter = portX * portX + portY * portY;
  
  if (portDistFromCenter < edgeDistFromCenter) {
    normPerpX = -normPerpX;
    normPerpY = -normPerpY;
    portX = edgeMidX + normPerpX * portDistance;
    portY = edgeMidY + normPerpY * portDistance;
  }
  
  const label = harbor.type === '3:1' ? '?' : HARBOR_ICONS[harbor.type];
  const ratio = harbor.type === '3:1' ? '3:1' : '2:1';
  
  return (
    <g className="harbor-group">
      {/* Lines connecting port to the two vertices it serves */}
      <line
        x1={portX} y1={portY}
        x2={v1x} y2={v1y}
        stroke="#c4a882"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1={portX} y1={portY}
        x2={v2x} y2={v2y}
        stroke="#c4a882"
        strokeWidth="3"
        strokeLinecap="round"
      />
      
      {/* Port circle */}
      <circle
        cx={portX}
        cy={portY}
        r="18"
        fill="#e8dcc8"
        stroke="#8b7355"
        strokeWidth="2"
      />
      
      {/* Resource icon or ? */}
      <text
        x={portX}
        y={portY - 3}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="14"
      >
        {label}
      </text>
      
      {/* Trade ratio */}
      <text
        x={portX}
        y={portY + 10}
        textAnchor="middle"
        fontSize="9"
        fontWeight="bold"
        fill="#5a4a3a"
      >
        {ratio}
      </text>
    </g>
  );
}

interface VertexProps {
  vertex: Vertex;
  position: { x: number; y: number };
  isValid: boolean;
  playerColor: string | null;
  onClick: () => void;
}

function VertexComponent({ vertex, position, isValid, playerColor, onClick }: VertexProps) {
  const { x, y } = position;
  
  if (vertex.building === 'settlement') {
    // House shape - looks like a small cottage
    return (
      <g 
        className={`building settlement ${isValid ? 'upgradeable' : ''}`}
        style={{ cursor: isValid ? 'pointer' : 'default' }}
        onClick={isValid ? onClick : undefined}
      >
        {/* Invisible click target for city upgrade - using rgba for proper click detection */}
        <circle
          cx={x}
          cy={y}
          r="22"
          fill="rgba(0,0,0,0.001)"
          pointerEvents="all"
        />
        {/* Highlight ring when upgradeable to city */}
        {isValid && (
          <circle
            cx={x}
            cy={y}
            r="18"
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            className="upgrade-indicator"
            pointerEvents="none"
          />
        )}
        {/* House body */}
        <rect
          x={x - 8}
          y={y - 2}
          width="16"
          height="12"
          fill={playerColor || '#666'}
          stroke={isValid ? '#22c55e' : '#1a1a1a'}
          strokeWidth={isValid ? 2.5 : 1.5}
          pointerEvents="none"
        />
        {/* Roof */}
        <polygon
          points={`${x - 10},${y - 2} ${x},${y - 12} ${x + 10},${y - 2}`}
          fill={playerColor || '#666'}
          stroke={isValid ? '#22c55e' : '#1a1a1a'}
          strokeWidth={isValid ? 2.5 : 1.5}
          pointerEvents="none"
        />
      </g>
    );
  }
  
  if (vertex.building === 'city') {
    // City shape - larger building with tower
    return (
      <g className="building city">
        {/* Main building */}
        <rect
          x={x - 10}
          y={y - 4}
          width="20"
          height="16"
          fill={playerColor || '#666'}
          stroke="#1a1a1a"
          strokeWidth="1.5"
        />
        {/* Tower */}
        <rect
          x={x - 5}
          y={y - 14}
          width="10"
          height="14"
          fill={playerColor || '#666'}
          stroke="#1a1a1a"
          strokeWidth="1.5"
        />
        {/* Tower roof */}
        <polygon
          points={`${x - 6},${y - 14} ${x},${y - 20} ${x + 6},${y - 14}`}
          fill={playerColor || '#666'}
          stroke="#1a1a1a"
          strokeWidth="1.5"
        />
      </g>
    );
  }
  
  if (isValid) {
    return (
      <motion.circle
        cx={x}
        cy={y}
        r="6"
        className="valid-vertex"
        onClick={onClick}
        whileHover={{ scale: 1.4, r: 8 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
    );
  }
  
  return null;
}

interface EdgeProps {
  edge: Edge;
  vertices: Vertex[];
  isValid: boolean;
  playerColor: string | null;
  onClick: () => void;
}

function EdgeComponent({ edge, vertices, isValid, playerColor, onClick }: EdgeProps) {
  const v1 = vertices.find(v => v.id === edge.vertexIds[0]);
  const v2 = vertices.find(v => v.id === edge.vertexIds[1]);
  
  if (!v1 || !v2) return null;
  
  const pos1 = getVertexPosition(v1);
  const pos2 = getVertexPosition(v2);
  
  if (!pos1 || !pos2) return null;
  
  // Calculate road rectangle
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const midX = (pos1.x + pos2.x) / 2;
  const midY = (pos1.y + pos2.y) / 2;
  
  if (edge.road) {
    // Draw road as a rounded rectangle
    const roadWidth = 8;
    const roadLength = length * 0.7; // Slightly shorter than full edge
    
    return (
      <g className="road-piece">
        <rect
          x={-roadLength / 2}
          y={-roadWidth / 2}
          width={roadLength}
          height={roadWidth}
          rx={3}
          ry={3}
          fill={playerColor || '#666'}
          stroke="#1a1a1a"
          strokeWidth="1.5"
          transform={`translate(${midX}, ${midY}) rotate(${angle})`}
        />
      </g>
    );
  }
  
  if (isValid) {
    return (
      <motion.g 
        onClick={onClick}
        className="valid-edge"
        whileHover={{ scale: 1.2 }}
      >
        <line
          x1={pos1.x}
          y1={pos1.y}
          x2={pos2.x}
          y2={pos2.y}
          stroke="rgba(168, 85, 247, 0.4)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <circle
          cx={midX}
          cy={midY}
          r="6"
          fill="rgba(168, 85, 247, 0.8)"
        />
      </motion.g>
    );
  }
  
  return null;
}

export function HexBoard() {
  const { gameState, playerId, buildMode } = useGameStore();
  
  if (!gameState) return null;
  
  const { board, phase, players } = gameState;
  const currentPlayer = players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer.id === playerId;
  const isSetupPhase = phase === 'setup_settlement' || phase === 'setup_road';
  const isRoadBuildingPhase = phase === 'road_building';
  
  // Calculate valid positions for setup phase
  const validSetupVertices = useMemo(() => {
    if (!isMyTurn || phase !== 'setup_settlement') {
      return new Set<string>();
    }
    
    const valid = new Set<string>();
    for (const vertex of board.vertices) {
      if (vertex.building) continue;
      
      // Check distance rule
      const hasAdjacentBuilding = board.edges
        .filter(e => e.vertexIds.includes(vertex.id))
        .some(e => {
          const otherId = e.vertexIds.find(id => id !== vertex.id);
          const other = board.vertices.find(v => v.id === otherId);
          return other?.building !== null;
        });
      
      if (!hasAdjacentBuilding) {
        valid.add(vertex.id);
      }
    }
    return valid;
  }, [isMyTurn, phase, board]);
  
  const validSetupEdges = useMemo(() => {
    if (!isMyTurn || phase !== 'setup_road') {
      return new Set<string>();
    }
    
    const player = players.find(p => p.id === playerId);
    if (!player?.lastPlacedVertexId) return new Set<string>();
    
    const valid = new Set<string>();
    for (const edge of board.edges) {
      if (edge.road) continue;
      if (edge.vertexIds.includes(player.lastPlacedVertexId)) {
        valid.add(edge.id);
      }
    }
    return valid;
  }, [isMyTurn, phase, board, players, playerId]);
  
  // Calculate valid positions for normal gameplay
  const validVertices = useMemo(() => {
    if (!isMyTurn || phase !== 'main' || buildMode === 'none' || buildMode === 'road') {
      return new Set<string>();
    }
    
    const player = players.find(p => p.id === playerId);
    if (!player) return new Set<string>();
    
    const valid = new Set<string>();
    
    for (const vertex of board.vertices) {
      if (buildMode === 'settlement') {
        // Check if player can afford
        const resources = player.resources;
        if (resources.wood < 1 || resources.brick < 1 || resources.sheep < 1 || resources.wheat < 1) continue;
        
        // Check if vertex is empty
        if (vertex.building) continue;
        
        // Check distance rule
        const adjacentHasBuilding = board.edges
          .filter(e => e.vertexIds.includes(vertex.id))
          .some(e => {
            const otherId = e.vertexIds.find(id => id !== vertex.id);
            const other = board.vertices.find(v => v.id === otherId);
            return other?.building !== null;
          });
        if (adjacentHasBuilding) continue;
        
        // Must have a connected road
        const hasConnectedRoad = board.edges.some(
          e => e.vertexIds.includes(vertex.id) && e.road && e.playerId === playerId
        );
        if (!hasConnectedRoad) continue;
        
        valid.add(vertex.id);
      }
      
      if (buildMode === 'city') {
        // Check if player can afford
        const resources = player.resources;
        if (resources.wheat < 2 || resources.ore < 3) continue;
        
        // Check if vertex has player's settlement
        if (vertex.building !== 'settlement' || vertex.playerId !== playerId) continue;
        
        valid.add(vertex.id);
      }
    }
    
    return valid;
  }, [isMyTurn, phase, buildMode, board, players, playerId]);
  
  const validEdges = useMemo(() => {
    if (!isMyTurn) return new Set<string>();
    
    // For road building dev card
    if (isRoadBuildingPhase) {
      const valid = new Set<string>();
      for (const edge of board.edges) {
        if (edge.road) continue;
        
        const [v1Id, v2Id] = edge.vertexIds;
        const v1 = board.vertices.find(v => v.id === v1Id);
        const v2 = board.vertices.find(v => v.id === v2Id);
        
        // Connected via building
        if (v1?.playerId === playerId || v2?.playerId === playerId) {
          valid.add(edge.id);
          continue;
        }
        
        // Connected via road
        const hasConnectedRoad = board.edges.some(e => {
          if (!e.road || e.playerId !== playerId) return false;
          return e.vertexIds.includes(v1Id) || e.vertexIds.includes(v2Id);
        });
        
        if (hasConnectedRoad) {
          valid.add(edge.id);
        }
      }
      return valid;
    }
    
    if (phase !== 'main' || buildMode !== 'road') {
      return new Set<string>();
    }
    
    const player = players.find(p => p.id === playerId);
    if (!player) return new Set<string>();
    
    // Check resources
    if (player.resources.wood < 1 || player.resources.brick < 1) {
      return new Set<string>();
    }
    
    const valid = new Set<string>();
    
    for (const edge of board.edges) {
      if (edge.road) continue;
      
      // Check if connected to player's network
      const [v1Id, v2Id] = edge.vertexIds;
      const v1 = board.vertices.find(v => v.id === v1Id);
      const v2 = board.vertices.find(v => v.id === v2Id);
      
      // Connected via building
      if (v1?.playerId === playerId || v2?.playerId === playerId) {
        valid.add(edge.id);
        continue;
      }
      
      // Connected via road
      const hasConnectedRoad = board.edges.some(e => {
        if (!e.road || e.playerId !== playerId) return false;
        return e.vertexIds.includes(v1Id) || e.vertexIds.includes(v2Id);
      });
      
      if (hasConnectedRoad) {
        valid.add(edge.id);
      }
    }
    
    return valid;
  }, [isMyTurn, phase, buildMode, board, players, playerId, isRoadBuildingPhase]);
  
  // Calculate SVG viewBox - extra padding for harbors
  const allPositions = board.hexes.map(h => axialToPixel(h.q, h.r));
  const minX = Math.min(...allPositions.map(p => p.x)) - HEX_SIZE - 80;
  const maxX = Math.max(...allPositions.map(p => p.x)) + HEX_SIZE + 80;
  const minY = Math.min(...allPositions.map(p => p.y)) - HEX_SIZE - 80;
  const maxY = Math.max(...allPositions.map(p => p.y)) + HEX_SIZE + 80;
  
  const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  
  const handleHexClick = (hexId: string) => {
    if (phase === 'robber_move' && isMyTurn) {
      socketService.moveRobber(hexId);
    }
  };
  
  const handleVertexClick = (vertexId: string) => {
    if (!isMyTurn) return;
    
    if (phase === 'setup_settlement') {
      socketService.placeInitialSettlement(vertexId);
    } else if (phase === 'main') {
      if (buildMode === 'settlement') {
        socketService.buildSettlement(vertexId);
      } else if (buildMode === 'city') {
        socketService.buildCity(vertexId);
      }
    }
  };
  
  const handleEdgeClick = (edgeId: string) => {
    if (!isMyTurn) return;
    
    if (phase === 'setup_road') {
      socketService.placeInitialRoad(edgeId);
    } else if (phase === 'main' || phase === 'road_building') {
      socketService.buildRoad(edgeId);
    }
  };
  
  const getPlayerColor = (pid: string | null): string | null => {
    if (!pid) return null;
    const player = players.find(p => p.id === pid);
    return player ? PLAYER_COLORS[player.color] : null;
  };
  
  // Combine all valid vertices/edges for display
  const allValidVertices = isSetupPhase ? validSetupVertices : validVertices;
  const allValidEdges = isSetupPhase ? validSetupEdges : validEdges;
  
  return (
    <svg 
      className="hex-board"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Gradient definitions */}
      <defs>
        <radialGradient id="oceanGradient" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#2980b9" />
          <stop offset="50%" stopColor="#1e5f8a" />
          <stop offset="100%" stopColor="#154360" />
        </radialGradient>
        <filter id="oceanTexture">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise"/>
          <feDiffuseLighting in="noise" lightingColor="#3498db" surfaceScale="1" result="light">
            <feDistantLight azimuth="45" elevation="60"/>
          </feDiffuseLighting>
          <feBlend in="SourceGraphic" in2="light" mode="overlay"/>
        </filter>
      </defs>
      
      {/* Water background */}
      <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="url(#oceanGradient)" />
      
      {/* Hex tiles - rendered first (bottom layer) */}
      <g className="hexes">
        {board.hexes.map(hex => (
          <HexTileComponent
            key={hex.id}
            tile={hex}
            isRobberTarget={phase === 'robber_move' && isMyTurn && !hex.hasRobber}
            onClick={() => handleHexClick(hex.id)}
          />
        ))}
      </g>
      
      {/* Roads (edges) */}
      <g className="edges">
        {board.edges.map(edge => (
          <EdgeComponent
            key={edge.id}
            edge={edge}
            vertices={board.vertices}
            isValid={allValidEdges.has(edge.id)}
            playerColor={getPlayerColor(edge.playerId)}
            onClick={() => handleEdgeClick(edge.id)}
          />
        ))}
      </g>
      
      {/* Buildings (vertices) */}
      <g className="vertices">
        {board.vertices.map(vertex => {
          const pos = getVertexPosition(vertex);
          if (!pos) return null;
          
          return (
            <VertexComponent
              key={vertex.id}
              vertex={vertex}
              position={pos}
              isValid={allValidVertices.has(vertex.id)}
              playerColor={getPlayerColor(vertex.playerId)}
              onClick={() => handleVertexClick(vertex.id)}
            />
          );
        })}
      </g>
      
      {/* Harbors - rendered last (top layer) so they're not hidden */}
      <g className="harbors">
        {board.harbors?.map(harbor => (
          <HarborComponent
            key={harbor.id}
            harbor={harbor}
            vertices={board.vertices}
          />
        ))}
      </g>
    </svg>
  );
}
