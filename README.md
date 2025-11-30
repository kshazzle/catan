# HexLands 🎲

A modern, multiplayer hex-based strategy board game inspired by classic resource-gathering games. Built with React, TypeScript, Node.js, and Socket.IO.

![HexLands](https://img.shields.io/badge/Players-2--4-blue) ![Status](https://img.shields.io/badge/Status-Beta-yellow)

## Features

- 🎮 **Real-time Multiplayer** - Play with 2-4 friends online
- 🗺️ **Randomized Boards** - Every game is unique
- 💎 **5 Resource Types** - Wood, Brick, Sheep, Wheat, and Ore
- 🏗️ **Build & Expand** - Roads, Settlements, and Cities
- 🦹 **Robber Mechanic** - Block production and steal resources
- 🔄 **Trading** - Trade with the bank (4:1) or negotiate with players
- 🏆 **Victory Points** - First to 10 wins!
- ✨ **Modern UI** - Gen Z-inspired dark mode with glassmorphism effects

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

1. Clone the repository and navigate to it:
   ```bash
   cd catan
   ```

2. Install all dependencies:
   ```bash
   npm run install:all
   ```

### Running the Game

Start both the server and client in development mode:

```bash
npm run dev
```

This will start:
- **Server** on `http://localhost:3001`
- **Client** on `http://localhost:5173`

Open `http://localhost:5173` in your browser to play!

### Running Separately

If you prefer to run the server and client separately:

**Server:**
```bash
cd server
npm run dev
```

**Client:**
```bash
cd client
npm run dev
```

## How to Play

### Setup
1. One player creates a game and shares the 6-character room code
2. Other players join using the room code
3. Host starts the game when everyone is ready

### Turn Flow
1. **Roll Dice** - Roll two dice to determine resource production
2. **Collect Resources** - Tiles with matching numbers produce resources for adjacent buildings
3. **Trade** - Trade with the bank (4:1) or propose trades with other players
4. **Build** - Spend resources to build roads, settlements, or upgrade to cities
5. **End Turn** - Pass to the next player

### Building Costs
| Building | Cost | Victory Points |
|----------|------|----------------|
| Road | 1 Wood + 1 Brick | 0 |
| Settlement | 1 Wood + 1 Brick + 1 Sheep + 1 Wheat | 1 |
| City (upgrade) | 2 Wheat + 3 Ore | 2 |

### Special Rules
- **Rolling a 7**: The robber is activated!
  - Players with 8+ cards must discard half
  - Current player moves the robber to block a tile
  - Player can steal 1 random resource from an opponent at that tile
- **Longest Road**: 2 bonus VP for having the longest continuous road (5+ segments)

### Winning
First player to reach **10 Victory Points** wins the game!

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- Framer Motion for animations
- Zustand for state management
- Socket.IO client for real-time communication

### Backend
- Node.js with Express
- Socket.IO for WebSocket communication
- In-memory room storage (ready for Redis/Postgres upgrade)

## Project Structure

```
catan/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Home/       # Landing page
│   │   │   ├── Lobby/      # Game lobby
│   │   │   └── Game/       # Main game UI
│   │   ├── services/       # Socket service
│   │   ├── state/          # Zustand store
│   │   ├── styles/         # Global CSS
│   │   └── types.ts        # TypeScript types
│   └── public/             # Static assets
│
├── server/                 # Node.js backend
│   └── src/
│       ├── game-logic/     # Game rules & board generation
│       ├── sockets/        # Socket handlers & room management
│       ├── types.ts        # Shared types
│       └── index.ts        # Server entry point
│
└── package.json            # Root package with scripts
```

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is for educational purposes. Not affiliated with or endorsed by any existing board game brands.

---

Made with ❤️ and lots of ☕

