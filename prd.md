# Online Catan-Style Multiplayer Board Game – Build Prompt

Build a web-based, multiplayer, turn-based Catan-style board game that runs fully in the browser for 2–4 players. The experience should feel modern, premium, and highly appealing to Gen Z while staying clean, readable, and easy to play.

---

## Tech stack

- Frontend:
  - React (or similar SPA framework) with TypeScript.
- Backend:
  - Node.js with WebSockets (or Socket.IO) for realtime multiplayer.
- Data:
  - In-memory room store for development, structured so Redis/Postgres can be plugged in later.

---

## Home screen

Implement a responsive home screen with:

- Game title at the top (e.g., “Online Catan Board Game” or a unique original name).
- Two large primary buttons:
  - “Create Game”
  - “Join Game”
- A visible “How to Play” / Rules section on the home screen, not hidden behind navigation.

Rules / How to play (write all text in your own words):

- Players: 2–4 players.
- Goal: Earn victory points by building roads, settlements, and cities on a hex-tile island.
- Turn flow:
  - On your turn: roll dice → collect resources → optionally trade → build → end turn.
  - Resource tiles produce when their number is rolled, rewarding adjacent settlements and cities.
- Robber:
  - When a 7 is rolled, trigger a “robber” phase:
    - Players with more than a chosen hand limit (e.g., 7 or 9) discard half of their resource cards (rounded down).
    - Current player moves the robber to a tile to block its production.
    - If that tile has opponents’ buildings, the current player randomly steals 1 resource card from one of them.
- Winning:
  - First player to reach 10 victory points wins the game.

The rules panel should be rendered as standard text and simple icons. Do not reuse or quote any official Catan rulebook text; paraphrase and keep everything original.

---

## Create game flow

When the user clicks “Create Game”:

- Generate a unique room code:
  - 6 characters, uppercase letters A–Z and digits 0–9.
- Navigate to a Lobby screen showing:
  - Room code with a “Copy” button.
  - Player list:
    - Each player’s name and assigned color.
  - Controls:
    - Dropdown / selector for “Number of Players” (2, 3, 4; default 4).
    - “Start Game” button:
      - Enabled only when at least 2 players are present.
- When “Start Game” is clicked:
  - Lock the room (no new joins).
  - Initialize game state.
  - Broadcast the game state to all connected players in that room.

---

## Join game flow

When the user clicks “Join Game”:

- Show a simple form:
  - Input: Player Name.
  - Input: Room Code.
  - Button: “Join Game”.
- On success:
  - Navigate to the same Lobby view as the host.
  - Show the updated list of players in real time as others join or leave.

Handle invalid codes and full rooms gracefully with inline error messages.

---

## Multiplayer and networking

Use WebSockets (or Socket.IO) for all realtime features:

- Room management:
  - Create room.
  - Join room.
  - Leave room / disconnect.
- Lobby events:
  - Player joined.
  - Player left.
  - Player ready (optional).
- Game events:
  - Start game.
  - Dice roll & resource distribution.
  - Robber movement and stealing.
  - Trades.
  - Building (roads, settlements, cities, optional dev cards).
  - End turn.
  - Game end / winner announcement.

Server-side should be authoritative:

- All random events (dice rolls, card draws) are generated on the server.
- All rule checks (valid placements, resource costs, turn order) are performed on the server.
- The client sends “intent” messages (e.g., “build road here”), and the server validates and applies changes.

---

## Game board

Implement a Catan-style hex map with original layout:

- Hex grid:
  - Island made of hex tiles in a roughly round/organic shape.
  - Terrain types:
    - Wood
    - Brick
    - Sheep
    - Wheat
    - Ore
    - Desert (or equivalent non-producing tile)
  - Each non-desert tile has a number token (2–12, excluding 7) for production.
  - Randomize tile arrangement and numbers for each new game, while avoiding impossible or very skewed setups.
- Graph representation:
  - Intersections (vertices) where settlements and cities can be placed.
  - Edges where roads can be built.
  - Keep clear mapping:
    - Which intersections neighbor which tiles.
    - Which edges connect which intersections.

Board UI:

- Use simple but polished visuals:
  - Hex tiles with distinct colors/textures per resource type.
  - Number tokens over tiles with clear text.
  - Robber marker that can be visually moved.
- Highlight:
  - Valid intersections for building settlements/cities.
  - Valid edges for building roads.
- Show hover and selection states for tiles, intersections, and edges.

---

## Turn structure

Each player’s turn follows this sequence:

1. Dice Phase (server-controlled):
   - Roll 2 dice.
   - If total is NOT 7:
     - For all tiles with that number:
       - Give resources to each player with settlements/cities adjacent to that tile.
       - Cities generate more resources than settlements.
   - If total is 7:
     - Enter robber phase:
       - Force discards for players above the hand limit.
       - Current player chooses a target tile to move the robber.
       - If that tile has enemy buildings, steal 1 random resource from one of the affected opponents.

2. Trade Phase:
   - Allow trades only on the current player’s turn.
   - Implement:
     - Player-to-bank trades at fixed ratios (e.g., 4 of one resource for 1 of any other).
     - Optional simple player-to-player trading:
       - Current player proposes an offer (resources to give) and a request (resources to receive).
       - Target player sees the offer and can accept or decline.

3. Build Phase:
   - Player may build as long as they have the required resources:
     - Road:
       - Costs: wood + brick.
       - Must be connected to the player’s existing road/settlement/city network.
     - Settlement:
       - Costs: wood + brick + sheep + wheat.
       - Must be placed on a free intersection connected to the player’s network, with no adjacent settlements.
     - City:
       - Costs: wheat + ore.
       - Upgrades an existing settlement owned by the player.
     - Optional Development Card:
       - Costs: sheep + wheat + ore.
       - Add to the player’s hidden dev card hand.
   - Actions are available via a clear action bar.

4. End Turn:
   - A dedicated “End Turn” button ends the current player’s turn.
   - Server advances to the next player and broadcasts the updated state.

---

## Player counts (2–4 players)

Support games with 2, 3, or 4 players:

- 4 players:
  - Use standard-style behavior.
- 3 players:
  - Same rules, fewer participants.
- 2 players:
  - Use a simplified variant:
    - Keep robber hand limit slightly higher (e.g., 9 cards) to keep the game flowing.
    - Allow direct player-to-player trades freely on each active player’s turn.
  - Avoid complex neutral-player mechanics; keep it simple and balanced enough for casual play.

---

## Victory conditions and scoring

Track and display victory points in real time:

- Settlement: 1 point.
- City: 2 points (replacing an existing settlement).
- Optional:
  - Longest Road:
    - 2 points for the player with the longest continuous road of at least 5 segments.
  - Largest Army (if dev cards / knight cards are implemented):
    - 2 points for the player who has played the most knights above a threshold.

End of game:

- When a player reaches 10 victory points:
  - Declare that player the winner.
  - Show a full-screen end-game modal:
    - Winner name and score.
    - Final standings for all players.
  - Lock further actions but keep the board visible.

---

## Gen Z UI direction

Make the entire interface feel modern, clean, and Gen Z–friendly.

Overall vibe:

- Dark-mode first:
  - Deep navy or charcoal background as base.
  - Soft neon gradients (teal, purple, magenta, cyan) in corners or behind panels.
- Use glassmorphism:
  - Frosted glass cards for main panels: blur, subtle border, and faint inner glow.
- Keep it minimal:
  - Good spacing and clear hierarchy.
  - Only a few strong focal points per screen.

Typography:

- Use a bold geometric sans-serif for headings (e.g., Poppins/Inter-style).
- Use a clean, readable sans-serif for body text.
- Style:
  - Large, punchy titles (e.g., “Create Game”, “Join Game”) with tight letter spacing.
  - Mostly sentence case for body text and rules.

Colors and components:

- Primary CTAs:
  - Pill-shaped buttons.
  - Gradient fill (e.g., cyan → purple, pink → orange) with a soft outer glow on hover.
  - Smooth scale and shadow animation on hover/tap.
- Secondary actions:
  - Outlined or subtle glass buttons to keep focus on primary CTAs.
- Player identity colors:
  - Assign vivid but harmonious colors (electric blue, neon green, bright coral, violet).
  - Show them via avatar rings, chips, and highlights.

Micro-interactions & motion:

- Transitions:
  - 200–300ms ease for hover, selection, and panel changes.
  - No jarring or instant jumps.
- Motion ideas:
  - Slight parallax or slow drift for background gradients.
  - Gentle scale/brightness bump on hover for cards and buttons.
  - When a player’s turn starts:
    - Animate a soft glow pulse around their player panel and the action bar.
- Provide a “reduced motion” setting:
  - When enabled, minimize animations and disable parallax.

Home screen layout:

- Centered hero glass card:
  - Game logo/title at the top.
  - Big “Create Game” and “Join Game” buttons stacked or side-by-side.
- Rules panel:
  - Separate glass card on the side or bottom.
  - Use icon + text bullets for each rule point.
- Responsive:
  - On mobile:
    - Stack content vertically with CTAs near thumb reach.
  - Keep the main call-to-action visible without scrolling.

Lobby and in-game HUD:

- Lobby:
  - Show players as cards or avatars in a horizontal list:
    - Name, color, ready indicator.
  - Display room code prominently with a copy icon.
  - Add small animated checkmarks or badges when players join/ready up.
- In-game:
  - Board centered.
  - HUD as semi-transparent glass panels at edges:
    - Left or top: players and scores.
    - Bottom: action bar with icon-based buttons (dice, road, house, city, trade, end turn).
    - Right or side: activity log and chat (optional).
  - Use icons plus short labels, not long text strings.

Accessibility:

- Ensure text on any background has at least ~4.5:1 contrast.
- Button hit areas should be comfortably large on mobile.
- Avoid overly busy visuals; keep the information structure simple above all.

---

## UI / UX details

Layout:

- Desktop:
  - Center board.
  - Sidebar panels for players and log.
  - Bottom action bar for turn actions.
- Mobile:
  - Board takes top area.
  - Sliding panels or drawers for player info, log, and actions.

Action bar:

- Buttons:
  - “Roll Dice” (only active when appropriate).
  - “Trade”.
  - “Build Road”.
  - “Build Settlement”.
  - “Build City”.
  - Optional “Play Dev Card”.
  - “End Turn”.
- Disable buttons when:
  - It’s not the player’s turn.
  - The action is not valid in the current phase.
  - The player lacks required resources.

Activity log:

- Small list of recent events, such as:
  - “Blue rolled 6.”
  - “Red built a road.”
  - “Green moved robber to wheat tile.”
- Use color-coding and icons for quick reading.

Disconnect/reconnect:

- If a player disconnects:
  - Keep their state on the server.
- Support reconnection:
  - If they rejoin with same room code and name (or token), restore them to their seat.

---

## Code organization and constraints

Project structure suggestions:

- `server/`
  - `game-logic/`:
    - Pure logic for board, turns, resource distribution, robber, scoring.
  - `sockets/`:
    - Room creation, joining, events, broadcasts.
- `client/`
  - `components/Board/`
  - `components/Lobby/`
  - `components/Home/`
  - `components/HUD/`
  - `components/RulesPanel/`
  - `state/` for client-side view state.

Copyright and IP constraints:

- Do not use official Catan names, assets, exact maps, or text.
- Use generic terminology like:
  - “hex tiles”, “resources”, “settlements”, “cities”, “roads”, “robber”.
- All rule explanations and UI copy must be original, not copied from any official sources.

---

## Final instructions

- Implement all features so that a group of 2–4 players can:
  - Open the site.
  - Create or join a room via code.
  - Play a full browser-based, turn-based hex-board resource game to 10 victory points.
- Prioritize:
  - Clean, Gen Z–friendly dark UI.
  - Smooth interactions.
  - Clear game flow.
- Once the base is working, you may iterate on visuals (animations, particles, sound effects) while keeping the core design simple and readable.
