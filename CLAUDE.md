# CLAUDE.md — townhall-games

This file describes the codebase structure, development workflows, and conventions for AI assistants working on this repository.

---

## Project Overview

**townhall-games** is a real-time multiplayer Buzzword Bingo game designed for town hall meetings. Players join a session, receive unique 5x5 bingo cards, and mark off words as they hear them. The first player to complete a winning pattern wins the round. Scores accumulate across multiple rounds.

---

## Architecture

The system can operate in two modes:

### Unified Local Mode
A single Node.js server (`src/server/index.ts`) serves both player and admin interfaces, handling all WebSocket connections locally.

```
Browser Players ──────────┐
                           ├──► Unified Server (port 3000)
Admin Browser ────────────┘     WsHandler + HTTP static files
```

### Distributed Mode (Production)
Admin server connects to a cloud relay that multiplexes player connections.

```
Player Browsers ──► Cloud Relay (port 10000) ◄──► Admin Server (port 3000)
                    RelayHandler                   AdminWsHandler
                                                   + AdminRelayClient
```

---

## Directory Structure

```
townhall-games/
├── .claude/
│   └── .bingo-spec.md        # Game specification (50+ test cases, mechanics)
├── .github/workflows/
│   └── test.yml              # CI: runs npm test on push/PR to main
├── src/
│   ├── core/                 # Game logic (no I/O dependencies)
│   │   ├── __tests__/
│   │   ├── bingo-card.ts     # 5x5 card generation, marking, win detection
│   │   ├── bingo-game.ts     # Multi-round game orchestration
│   │   ├── session.ts        # Player roster, scoring, event emission
│   │   └── types.ts          # Shared TypeScript types
│   ├── relay/                # Cloud WebSocket relay/multiplexer
│   │   ├── __tests__/
│   │   ├── relay-main.ts     # Entry point (port 10000)
│   │   ├── relay-handler.ts  # Admin/player connection routing
│   │   └── relay-protocol.ts # Relay envelope message types
│   ├── server/               # Game and admin servers
│   │   ├── __tests__/
│   │   ├── index.ts          # Unified server entry point
│   │   ├── admin-main.ts     # Admin server entry point
│   │   ├── admin-ws-handler.ts   # Admin WebSocket handler
│   │   ├── admin-relay-client.ts # Admin→relay connection
│   │   ├── ws-handler.ts     # Player WebSocket handler (unified mode)
│   │   ├── http-server.ts    # Static file serving
│   │   └── protocol.ts       # Client↔server message types
│   ├── demo.ts               # Local demo harness
│   └── demo-session.ts       # Demo session helper
├── public/
│   ├── index.html            # Player UI
│   ├── admin.html            # Admin UI
│   └── style.css             # Shared styles
├── package.json
├── tsconfig.json
├── jest.config.js
└── render.yaml               # Render.com deployment config
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5.9.3 (strict mode, ES2020, CommonJS) |
| Runtime | Node.js 18+ |
| WebSockets | `ws` 8.19.0 |
| Environment | `dotenv` 17.3.1 |
| Testing | Jest 30 + ts-jest 29 |
| Build | `tsc` → `dist/` |
| Deployment | Render.com (relay), local (admin/server) |
| CI | GitHub Actions |

---

## Development Commands

```bash
npm test                 # Run all Jest tests
npm run test:coverage    # Tests + coverage report
npm run build            # Compile TypeScript → dist/
npm start                # Unified server (dist/server/index.js)
npm run start:admin      # Admin server (dist/server/admin-main.js)
npm run start:relay      # Relay server (dist/relay/relay-main.js)
npm run dev              # Compile + run relay + admin (uses .env)
npm run demo             # Compile + run demo harness
```

`npm run dev` requires a `.env` file (not committed) with relay variables set.

---

## Environment Variables

| Variable | Used By | Description |
|---|---|---|
| `PORT` | All servers | Listen port (default: 3000 for server/admin, 10000 for relay) |
| `RELAY_URL` | Admin server | WebSocket URL of the relay (`ws://host:port`) |
| `RELAY_SECRET` | Admin server + relay | Shared secret for relay authentication |

---

## Core Game Logic (`src/core/`)

This layer has **no I/O dependencies** — it is pure game logic. All classes are instantiated by the server layer.

### `types.ts`
All shared types. Read this first when making changes. Key types:
- `WinPattern` — discriminated union: `horizontal | vertical | diagonal | corners`
- `MarkResult` — result returned when a player marks a word
- `Player`, `PlayerScore`, `Winner`
- Event types: `GameStartedEvent`, `PlayerWonEvent`, `NewRoundStartedEvent`, `PlayerJoinedEvent`, `PlayerLeftEvent`

### `BingoCard` (`bingo-card.ts`)
Represents a single player's 5x5 card.
- **Center `[2][2]`** is always `"FREE"` and pre-marked.
- `BingoCard.generate(wordList, playerId)` — static factory, shuffles words randomly.
- `markWord(word)` — case-insensitive match.
- `hasWon()` / `getWinningPattern()` — checks all 5 win patterns.

**Win patterns:**
1. Any complete row (5 patterns)
2. Any complete column (5 patterns)
3. Main diagonal (top-left → bottom-right)
4. Anti-diagonal (top-right → bottom-left)
5. Four corners + center

### `BingoGame` (`bingo-game.ts`)
Orchestrates game rounds.
- State machine: `'waiting' → 'active' → 'finished'` (finished is terminal after a round with a winner).
- `generateCardForPlayer(playerId)` — creates and stores a unique card.
- `markWord(playerId, word)` — returns `MarkResult`; sets winner if bingo detected.
- `startNewRound()` — increments round number, regenerates all player cards, resets winner state.

### `Session` (`session.ts`)
High-level manager — the main interface used by server handlers.
- Manages player roster (`addPlayer`, `removePlayer`).
- Delegates to `BingoGame` for game operations.
- Tracks cumulative scores across rounds (`totalPoints`, `roundsWon`).
- Observer pattern: `addEventListener(listener)` for game lifecycle events.
- Late joiners: if game is active, `addPlayer` auto-generates a card.

---

## WebSocket Protocol (`src/server/protocol.ts`)

All messages are JSON. See the file for the full discriminated union types.

### Client → Server
```json
{ "type": "create_session", "words": ["word1", "word2"] }
{ "type": "start_game" }
{ "type": "start_new_round" }
{ "type": "join", "screenName": "Alice" }
{ "type": "mark_word", "word": "synergy" }
```

### Server → Client
```json
{ "type": "session_created", "sessionId": "..." }
{ "type": "joined", "playerId": "...", "screenName": "Alice", "gameStatus": "waiting", "round": 1 }
{ "type": "card_dealt", "roundNumber": 1, "grid": [["word",...]], "marked": [[false,...]] }
{ "type": "mark_result", "success": true, "word": "synergy", "bingo": false, "roundOver": false }
{ "type": "player_won", "winnerName": "Bob", "pattern": {...}, "roundNumber": 1 }
{ "type": "leaderboard", "entries": [{ "playerId": "...", "screenName": "Alice", "totalPoints": 100, "roundsWon": 1 }] }
{ "type": "game_status", "status": "active", "round": 2 }
{ "type": "player_joined", "playerId": "...", "screenName": "Carol", "playerCount": 3 }
{ "type": "player_left", "playerId": "...", "screenName": "Dave", "playerCount": 2 }
{ "type": "error", "message": "..." }
```

---

## Relay Protocol (`src/relay/relay-protocol.ts`)

Used only between the admin server and the cloud relay. Admin authenticates with `RELAY_SECRET`, then the relay forwards player messages upstream and admin messages downstream.

```json
// Admin → Relay
{ "envelope": "admin_register", "sessionId": "...", "secret": "..." }
{ "envelope": "downstream", "target": "<connectionId>", "event": "..." }
{ "envelope": "broadcast", "event": "..." }

// Relay → Admin
{ "envelope": "admin_registered", "sessionId": "..." }
{ "envelope": "player_connected", "connectionId": "..." }
{ "envelope": "player_disconnected", "connectionId": "..." }
{ "envelope": "player_roster", "connections": ["..."] }
{ "envelope": "upstream", "connectionId": "...", "command": "..." }
```

---

## Testing

Tests live in `__tests__/` subdirectories next to the source they test.

```bash
src/core/__tests__/bingo-card.test.ts       # ~610 lines
src/core/__tests__/bingo-game.test.ts       # ~530 lines
src/core/__tests__/session.test.ts          # ~555 lines
src/relay/__tests__/relay-handler.test.ts
src/relay/__tests__/relay-protocol.test.ts
src/server/__tests__/ws-handler.test.ts
src/server/__tests__/admin-ws-handler.test.ts
src/server/__tests__/admin-relay-client.test.ts
src/server/__tests__/protocol.test.ts
```

**Always run `npm test` before committing.** The CI pipeline runs `npm test` on every push and PR to `main`.

When adding new game mechanics or protocol messages, add tests in the corresponding `__tests__` file. Follow the existing `describe/it` block structure in each file.

---

## Key Design Patterns

- **Factory methods**: `BingoCard.generate()`, `createWsHandler()`, `createAdminWsHandler()` — prefer these over `new`.
- **Observer / event listener**: `Session.addEventListener()` — server handlers subscribe to game events here.
- **Discriminated unions**: All protocol messages and game types use `type` or `envelope` discriminant fields for safe exhaustive parsing.
- **Transport abstraction**: `AdminWsHandler` uses a `RelayTransport` interface so it works identically whether connected locally or via relay.
- **State machine**: `BingoGame.status` transitions are strictly enforced; actions on wrong states are no-ops or errors.

---

## Adding New Features — Typical Workflow

1. **Update types** in `src/core/types.ts` if new data shapes are needed.
2. **Update core logic** in `src/core/` (`BingoCard`, `BingoGame`, `Session`).
3. **Update protocol** in `src/server/protocol.ts` if new client↔server messages are needed.
4. **Update handlers** in `src/server/ws-handler.ts` and/or `src/server/admin-ws-handler.ts`.
5. **Update relay protocol** in `src/relay/relay-protocol.ts` if relay envelope changes are needed.
6. **Add/update tests** in the relevant `__tests__` directory.
7. **Run `npm test`** — all tests must pass.
8. **Run `npm run build`** — TypeScript must compile cleanly.
9. Update `public/index.html` or `public/admin.html` if the frontend needs changes.

---

## CI/CD

- **CI**: GitHub Actions (`.github/workflows/test.yml`) runs `npm ci && npm test` on push/PR to `main`. Node 18, Ubuntu.
- **Deployment**: Render.com (`render.yaml`) deploys the relay server (`npm run start:relay`), port 10000, Frankfurt region. Build: `npm install && npm run build`. Secrets managed via Render environment group `town-hall-games`.

---

## Game Specification

See `.claude/.bingo-spec.md` for the full game specification, including:
- Detailed card generation rules
- All win pattern definitions with grid examples
- Scoring rules (100 points per round win)
- Multi-round flow
- 50+ test case descriptions
- Implementation order recommendations
