import { Room, RoomPlayer, PlayerColor, GameSettings } from '../types';

const PLAYER_COLORS: PlayerColor[] = ['blue', 'green', 'coral', 'violet'];

// In-memory room storage (can be replaced with Redis/Postgres later)
const rooms = new Map<string, Room>();
const playerToRoom = new Map<string, string>(); // socketId -> roomCode

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Make sure it's unique
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

function getNextColor(players: RoomPlayer[]): PlayerColor {
  const usedColors = new Set(players.map(p => p.color));
  for (const color of PLAYER_COLORS) {
    if (!usedColors.has(color)) {
      return color;
    }
  }
  return PLAYER_COLORS[0];
}

export function createRoom(hostId: string, hostName: string): Room {
  const code = generateRoomCode();
  const room: Room = {
    code,
    hostId,
    players: [
      {
        id: hostId,
        name: hostName,
        color: PLAYER_COLORS[0],
        ready: true,
      },
    ],
    maxPlayers: 4,
    started: false,
    gameState: null,
  };
  
  rooms.set(code, room);
  playerToRoom.set(hostId, code);
  
  return room;
}

export function joinRoom(roomCode: string, playerId: string, playerName: string): 
  { success: true; room: Room } | { success: false; error: string } {
  
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room) {
    return { success: false, error: 'Room not found' };
  }
  
  if (room.started) {
    // Check if this is a reconnecting player
    const existingPlayer = room.players.find(p => p.name === playerName);
    if (existingPlayer && room.gameState) {
      // Allow reconnection
      const gamePlayer = room.gameState.players.find(p => p.name === playerName);
      if (gamePlayer) {
        gamePlayer.connected = true;
        playerToRoom.set(playerId, roomCode.toUpperCase());
        return { success: true, room };
      }
    }
    return { success: false, error: 'Game already started' };
  }
  
  if (room.players.length >= room.maxPlayers) {
    return { success: false, error: 'Room is full' };
  }
  
  if (room.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
    return { success: false, error: 'Name already taken in this room' };
  }
  
  const color = getNextColor(room.players);
  room.players.push({
    id: playerId,
    name: playerName,
    color,
    ready: false,
  });
  
  playerToRoom.set(playerId, roomCode.toUpperCase());
  
  return { success: true, room };
}

export function leaveRoom(playerId: string): { room: Room; removed: boolean } | null {
  const roomCode = playerToRoom.get(playerId);
  if (!roomCode) return null;
  
  const room = rooms.get(roomCode);
  if (!room) return null;
  
  playerToRoom.delete(playerId);
  
  // If game is in progress, just mark as disconnected
  if (room.started && room.gameState) {
    const gamePlayer = room.gameState.players.find(p => p.id === playerId);
    if (gamePlayer) {
      gamePlayer.connected = false;
    }
    return { room, removed: false };
  }
  
  // Remove from lobby
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return null;
  
  room.players.splice(playerIndex, 1);
  
  // If room is empty, delete it
  if (room.players.length === 0) {
    rooms.delete(roomCode);
    return { room, removed: true };
  }
  
  // If host left, transfer to next player
  if (room.hostId === playerId) {
    room.hostId = room.players[0].id;
  }
  
  return { room, removed: false };
}

export function getRoom(roomCode: string): Room | undefined {
  return rooms.get(roomCode.toUpperCase());
}

export function getRoomByPlayerId(playerId: string): Room | undefined {
  const roomCode = playerToRoom.get(playerId);
  if (!roomCode) return undefined;
  return rooms.get(roomCode);
}

export function setMaxPlayers(roomCode: string, maxPlayers: number): Room | null {
  const room = rooms.get(roomCode);
  if (!room || room.started) return null;
  
  room.maxPlayers = Math.max(2, Math.min(4, maxPlayers));
  return room;
}

export function getDefaultGameSettings(playerCount: number): GameSettings {
  return {
    maxPlayers: playerCount,
    handLimit: playerCount === 2 ? 9 : 7, // Higher limit for 2 players
    victoryPointsToWin: 10,
  };
}

export function updatePlayerInRoom(roomCode: string, playerId: string, newPlayerId: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;
  
  const player = room.players.find(p => p.id === playerId);
  if (player) {
    player.id = newPlayerId;
  }
  
  if (room.hostId === playerId) {
    room.hostId = newPlayerId;
  }
  
  if (room.gameState) {
    const gamePlayer = room.gameState.players.find(p => p.id === playerId);
    if (gamePlayer) {
      gamePlayer.id = newPlayerId;
    }
  }
  
  playerToRoom.delete(playerId);
  playerToRoom.set(newPlayerId, roomCode);
}

