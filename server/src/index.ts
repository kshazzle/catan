import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { ClientToServerEvents, ServerToClientEvents } from './types';
import { setupSocketHandlers } from './sockets/handlers';

// Railway provides PORT via environment variable - MUST use it
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

console.log(`Environment PORT: ${process.env.PORT}`);
console.log(`Using PORT: ${PORT}`);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://st-catan.web.app',
      'https://st-catan.firebaseapp.com',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['polling', 'websocket'], // Support both for Render compatibility
  allowEIO3: true, // Allow Engine.IO v3 clients
  pingTimeout: 60000, // Increase timeout for Render free tier
  pingInterval: 25000,
});

// Root endpoint for Railway healthcheck
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'hexlands-server', timestamp: new Date().toISOString() });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO test endpoint
app.get('/socket-test', (req, res) => {
  res.json({ 
    status: 'ok', 
    socketIo: 'available',
    timestamp: new Date().toISOString() 
  });
});

// Setup socket handlers
setupSocketHandlers(io);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 HexLands server running on port ${PORT} (env PORT: ${process.env.PORT || 'not set'})`);
});

