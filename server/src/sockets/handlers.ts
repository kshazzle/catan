import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, Resources, RoomPlayer, HexTile, ResourceType } from '../types';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomByPlayerId,
  setMaxPlayers,
  getDefaultGameSettings,
} from './rooms';
import {
  createGameState,
  rollDice,
  distributeResources,
  buildRoad,
  buildSettlement,
  buildCity,
  moveRobber,
  stealResource,
  discardHalfResources,
  getPlayersToDiscard,
  getPlayersToStealFrom,
  getCurrentPlayer,
  getPlayerById,
  endTurn,
  bankTrade,
  createTradeOffer,
  acceptTrade,
  addLogEntry,
  placeInitialSettlement,
  placeInitialRoad,
  buyDevCard,
  playKnight,
  playRoadBuilding,
  playYearOfPlenty,
  playMonopoly,
  buildRoadFromRoadBuilding,
} from '../game-logic/game';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(io: TypedServer): void {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`Client connected: ${socket.id}`);

    // Create a new room
    socket.on('createRoom', (playerName, callback) => {
      try {
        const room = createRoom(socket.id, playerName);
        socket.join(room.code);
        callback({ success: true, roomCode: room.code });
        io.to(room.code).emit('roomUpdate', room);
      } catch (error) {
        callback({ success: false, error: 'Failed to create room' });
      }
    });

    // Join an existing room
    socket.on('joinRoom', (roomCode, playerName, callback) => {
      const result = joinRoom(roomCode, socket.id, playerName);
      
      if (!result.success) {
        callback({ success: false, error: result.error });
        return;
      }
      
      socket.join(roomCode.toUpperCase());
      callback({ success: true });
      
      // If game is in progress, send game state
      if (result.room.gameState) {
        socket.emit('gameUpdate', result.room.gameState);
      }
      
      io.to(roomCode.toUpperCase()).emit('roomUpdate', result.room);
    });

    // Leave room
    socket.on('leaveRoom', () => {
      handleDisconnect(socket, io);
    });

    // Set max players (host only)
    socket.on('setMaxPlayers', (maxPlayers) => {
      const room = getRoomByPlayerId(socket.id);
      if (!room || room.hostId !== socket.id) return;
      
      const updatedRoom = setMaxPlayers(room.code, maxPlayers);
      if (updatedRoom) {
        io.to(room.code).emit('roomUpdate', updatedRoom);
      }
    });

    // Start the game (host only)
    socket.on('startGame', () => {
      const room = getRoomByPlayerId(socket.id);
      if (!room || room.hostId !== socket.id) return;
      if (room.players.length < 2 || room.started) return;

      room.started = true;
      const settings = getDefaultGameSettings(room.players.length);
      const playerData = room.players.map((p: RoomPlayer) => ({ id: p.id, name: p.name }));
      room.gameState = createGameState(room.code, playerData, settings);

      addLogEntry(room.gameState, 'Game started! Setup phase begins.', 'system', null);
      addLogEntry(room.gameState, `${room.gameState.players[0].name}'s turn to place a settlement`, 'system', null);

      io.to(room.code).emit('roomUpdate', room);
      io.to(room.code).emit('gameUpdate', room.gameState);
    });

    // ============ SETUP PHASE ============

    socket.on('placeInitialSettlement', (vertexId) => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      if (state.phase !== 'setup_settlement') return;

      const currentPlayer = getCurrentPlayer(state);
      if (currentPlayer.id !== socket.id) return;

      if (placeInitialSettlement(state, socket.id, vertexId)) {
        io.to(room.code).emit('gameUpdate', state);
      }
    });

    socket.on('placeInitialRoad', (edgeId) => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      if (state.phase !== 'setup_road') return;

      const currentPlayer = getCurrentPlayer(state);
      if (currentPlayer.id !== socket.id) return;

      if (placeInitialRoad(state, socket.id, edgeId)) {
        io.to(room.code).emit('gameUpdate', state);
      }
    });

    // ============ NORMAL GAMEPLAY ============

    // Roll dice
    socket.on('rollDice', () => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      const currentPlayer = getCurrentPlayer(state);

      if (currentPlayer.id !== socket.id || state.phase !== 'roll') return;

      const [die1, die2] = rollDice(state);
      const total = die1 + die2;

      addLogEntry(state, `${currentPlayer.name} rolled ${die1} + ${die2} = ${total}`, 'roll', currentPlayer.id);

      if (total === 7) {
        // Check for players who need to discard
        const playersToDiscard = getPlayersToDiscard(state);
        if (playersToDiscard.length > 0) {
          state.phase = 'robber_discard';
          state.discardingPlayerIds = playersToDiscard.map((p) => p.id);
        } else {
          state.phase = 'robber_move';
        }
        // After rolling 7, always go to main phase after robber
        state.phaseBeforeRobber = 'main';
      } else {
        distributeResources(state, total);
        state.phase = 'main';
      }

      io.to(room.code).emit('gameUpdate', state);
    });

    // Build road
    socket.on('buildRoad', (edgeId) => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      const currentPlayer = getCurrentPlayer(state);

      if (currentPlayer.id !== socket.id) return;
      
      // Handle road building from dev card
      if (state.phase === 'road_building') {
        if (buildRoadFromRoadBuilding(state, socket.id, edgeId)) {
          io.to(room.code).emit('gameUpdate', state);
        }
        return;
      }
      
      if (state.phase !== 'main') return;

      if (buildRoad(state, socket.id, edgeId)) {
        io.to(room.code).emit('gameUpdate', state);
      }
    });

    // Build settlement
    socket.on('buildSettlement', (vertexId) => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      const currentPlayer = getCurrentPlayer(state);

      if (currentPlayer.id !== socket.id || state.phase !== 'main') return;

      if (buildSettlement(state, socket.id, vertexId)) {
        io.to(room.code).emit('gameUpdate', state);
      }
    });

    // Build city
    socket.on('buildCity', (vertexId) => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      const currentPlayer = getCurrentPlayer(state);

      if (currentPlayer.id !== socket.id || state.phase !== 'main') return;

      if (buildCity(state, socket.id, vertexId)) {
        io.to(room.code).emit('gameUpdate', state);
      }
    });

    // Move robber
    socket.on('moveRobber', (hexId) => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      const currentPlayer = getCurrentPlayer(state);

      if (currentPlayer.id !== socket.id || state.phase !== 'robber_move') return;

      const currentRobberHex = state.board.hexes.find((h: HexTile) => h.hasRobber);
      if (currentRobberHex?.id === hexId) {
        socket.emit('error', 'Must move robber to a different tile');
        return;
      }

      if (moveRobber(state, hexId)) {
        const playersToSteal = getPlayersToStealFrom(state, hexId);
        if (playersToSteal.length > 0) {
          state.phase = 'robber_steal';
        } else {
          // Return to phase before robber (for knight card), default to 'main'
          state.phase = state.phaseBeforeRobber || 'main';
          state.phaseBeforeRobber = null;
        }
        io.to(room.code).emit('gameUpdate', state);
      }
    });

    // Steal resource
    socket.on('stealResource', (targetPlayerId) => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      const currentPlayer = getCurrentPlayer(state);

      if (currentPlayer.id !== socket.id || state.phase !== 'robber_steal') return;

      stealResource(state, targetPlayerId);
      // Return to phase before robber (for knight card), default to 'main'
      state.phase = state.phaseBeforeRobber || 'main';
      state.phaseBeforeRobber = null;
      io.to(room.code).emit('gameUpdate', state);
    });

    // Discard resources (when 7 is rolled)
    socket.on('discardResources', (resources) => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;

      if (state.phase !== 'robber_discard') return;
      if (!state.discardingPlayerIds.includes(socket.id)) return;

      if (discardHalfResources(state, socket.id, resources)) {
        // Check if all players have discarded
        if (state.discardingPlayerIds.length === 0) {
          state.phase = 'robber_move';
        }
        io.to(room.code).emit('gameUpdate', state);
      }
    });

    // ============ TRADING ============

    // Propose trade
    socket.on('proposeTrade', (offer) => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      const currentPlayer = getCurrentPlayer(state);

      if (currentPlayer.id !== socket.id || state.phase !== 'main') return;

      const tradeOffer = createTradeOffer(
        state,
        socket.id,
        offer.toPlayerId,
        offer.offering,
        offer.requesting
      );

      if (tradeOffer) {
        state.phase = 'trade';
        io.to(room.code).emit('gameUpdate', state);
      }
    });

    // Respond to trade
    socket.on('respondToTrade', (accept) => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;

      if (state.phase !== 'trade' || !state.tradeOffer) return;
      if (state.tradeOffer.toPlayerId !== socket.id) return;

      if (accept) {
        acceptTrade(state);
      } else {
        state.tradeOffer.status = 'declined';
        addLogEntry(state, `Trade declined`, 'trade', socket.id);
      }

      state.tradeOffer = null;
      state.phase = 'main';
      io.to(room.code).emit('gameUpdate', state);
    });

    // Cancel trade
    socket.on('cancelTrade', () => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;

      if (state.phase !== 'trade' || !state.tradeOffer) return;
      if (state.tradeOffer.fromPlayerId !== socket.id) return;

      state.tradeOffer = null;
      state.phase = 'main';
      io.to(room.code).emit('gameUpdate', state);
    });

    // Bank trade
    socket.on('bankTrade', (giving, receiving) => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      const currentPlayer = getCurrentPlayer(state);

      if (currentPlayer.id !== socket.id || state.phase !== 'main') return;

      if (bankTrade(state, socket.id, giving, receiving)) {
        io.to(room.code).emit('gameUpdate', state);
      }
    });

    // ============ DEVELOPMENT CARDS ============

    socket.on('buyDevCard', () => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      const currentPlayer = getCurrentPlayer(state);

      if (currentPlayer.id !== socket.id || state.phase !== 'main') return;

      if (buyDevCard(state, socket.id)) {
        io.to(room.code).emit('gameUpdate', state);
      }
    });

    socket.on('playKnight', () => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      const currentPlayer = getCurrentPlayer(state);

      if (currentPlayer.id !== socket.id) return;
      if (state.phase !== 'main' && state.phase !== 'roll') return;

      if (playKnight(state, socket.id)) {
        io.to(room.code).emit('gameUpdate', state);
      }
    });

    socket.on('playRoadBuilding', () => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      const currentPlayer = getCurrentPlayer(state);

      if (currentPlayer.id !== socket.id || state.phase !== 'main') return;

      if (playRoadBuilding(state, socket.id)) {
        io.to(room.code).emit('gameUpdate', state);
      }
    });

    socket.on('playYearOfPlenty', (resource1: ResourceType, resource2: ResourceType) => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      const currentPlayer = getCurrentPlayer(state);

      if (currentPlayer.id !== socket.id || state.phase !== 'main') return;

      if (playYearOfPlenty(state, socket.id, resource1, resource2)) {
        io.to(room.code).emit('gameUpdate', state);
      }
    });

    socket.on('playMonopoly', (resource: ResourceType) => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      const currentPlayer = getCurrentPlayer(state);

      if (currentPlayer.id !== socket.id || state.phase !== 'main') return;

      if (playMonopoly(state, socket.id, resource)) {
        io.to(room.code).emit('gameUpdate', state);
      }
    });

    // ============ END TURN ============

    socket.on('endTurn', () => {
      const room = getRoomByPlayerId(socket.id);
      if (!room?.gameState) return;

      const state = room.gameState;
      const currentPlayer = getCurrentPlayer(state);

      if (currentPlayer.id !== socket.id || state.phase !== 'main') return;

      endTurn(state);
      io.to(room.code).emit('gameUpdate', state);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      handleDisconnect(socket, io);
    });
  });
}

function handleDisconnect(socket: TypedSocket, io: TypedServer): void {
  console.log(`Client disconnected: ${socket.id}`);
  
  const result = leaveRoom(socket.id);
  if (!result) return;

  const { room, removed } = result;

  if (!removed) {
    io.to(room.code).emit('roomUpdate', room);
    io.to(room.code).emit('playerDisconnected', socket.id);
    
    if (room.gameState) {
      io.to(room.code).emit('gameUpdate', room.gameState);
    }
  }
}
