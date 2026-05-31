# CLAUDE.md — townhall-games

This file describes the codebase structure, development workflows, and conventions for AI assistants working on this repository.

**Keep this file up to date.** When you change the directory structure, protocol messages, URL routes, or dev commands, update the relevant section here. Every `openspec/tasks.md` should include a task to update CLAUDE.md if structural changes are involved.

---

## Project Overview

**townhall-games** is a real-time multiplayer game platform for town hall meetings. The current game mode is:

- **Teams Trivia** — Elimination trivia with a 10s countdown per question. Wrong answers (or no answer) eliminate the player. Last survivors win.

---

## Architecture

The system can operate in two modes:

### Unified Local Mode
A single Node.js server (`src/server/index.ts`) serves both player and admin interfaces.

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

The relay is transport-only and game-mode agnostic.

---

## Directory Structure

```
townhall-games/
├── .claude/                         # AI assistant context
├── .github/workflows/
│   ├── test.yml                     # CI: npm test on push/PR to main
│   └── e2e.yml                      # E2E smoke test after CI passes
├── e2e/                             # Playwright end-to-end tests
│   ├── broadcast-lobby.spec.ts
│   └── fixtures.ts
├── openspec/                        # Change management (see openspec Workflow below)
│   ├── config.yaml
│   ├── specs/                       # Current canonical specs per feature
│   └── changes/                     # Per-change proposals, designs, tasks (archive/)
├── product/
│   ├── teams-trivia-spec.md         # Full trivia technical spec — authoritative reference
│   └── backlog.md                   # Product ideas/backlog
├── public/
│   ├── admin/
│   │   ├── index.html               # Redirects to /admin/trivia
│   │   └── trivia.html              # Trivia setup (CSV import) + controller
│   ├── broadcast/
│   │   └── trivia.html              # Trivia broadcast screen
│   ├── play/
│   │   └── index.html               # Trivia player view
│   ├── shared/                      # Compiled JS modules served statically
│   │   ├── state.js
│   │   ├── ui.js
│   │   ├── handlers.js
│   │   ├── ws-client.js
│   │   ├── player.js
│   │   ├── csv-parser.js
│   │   ├── trivia-handlers.js
│   │   ├── trivia-admin.js
│   │   └── trivia-broadcast.js
│   └── style.css
├── scripts/
│   └── smoke-test.js                # Post-deploy smoke test (hits /version endpoint)
├── src/
│   ├── client/                      # TypeScript source for public/shared/ modules
│   │   ├── __tests__/
│   │   ├── state.ts
│   │   ├── ui.ts
│   │   ├── handlers.ts
│   │   ├── ws-client.ts
│   │   ├── player.ts
│   │   └── trivia-handlers.ts
│   ├── core/                        # Pure game logic — no I/O dependencies
│   │   ├── __tests__/
│   │   ├── games/
│   │   │   └── trivia/
│   │   │       ├── trivia-game.ts   # TriviaGame state machine (6 phases)
│   │   │       ├── trivia-round.ts  # Per-question answer collection + elimination
│   │   │       ├── csv-parser.ts    # CSV question import + validation
│   │   │       └── index.ts         # Re-exports
│   │   ├── session.ts               # Player roster and event system
│   │   └── types.ts                 # All shared TypeScript types
│   ├── relay/                       # Cloud WebSocket relay/multiplexer
│   │   ├── __tests__/
│   │   ├── relay-main.ts            # Entry point (port 10000)
│   │   ├── relay-handler.ts         # Admin/player connection routing
│   │   ├── relay-protocol.ts        # Relay envelope message types
│   │   └── version-handler.ts       # GET /version endpoint (used by smoke test)
│   ├── server/                      # Game and admin servers
│   │   ├── __tests__/
│   │   ├── index.ts                 # Unified server entry point
│   │   ├── admin-main.ts            # Admin server entry point
│   │   ├── admin-ws-handler.ts      # Admin WebSocket handler
│   │   ├── admin-relay-client.ts    # Admin→relay connection
│   │   ├── ws-handler.ts            # Player WebSocket handler
│   │   ├── http-server.ts           # Static file serving + URL routing
│   │   └── protocol.ts              # All client↔server message types
│   └── fixtures/
│       └── trivia-questions.csv     # Sample questions for demo/test
├── package.json
├── tsconfig.json                    # Server TypeScript config
├── tsconfig.client.json             # Client TypeScript config (outputs to public/shared/)
├── jest.config.js
├── playwright.config.ts
└── render.yaml                      # Render.com deployment config
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5.9.3 (strict mode, ES2020, CommonJS) |
| Runtime | Node.js 18+ |
| WebSockets | `ws` 8.19.0 |
| Environment | `dotenv` 17.3.1 |
| Unit testing | Jest 30 + ts-jest 29 |
| E2E testing | Playwright 1.58 |
| Build | `tsc` → `dist/` (server), `tsc -p tsconfig.client.json` → `public/shared/` (client) |
| Deployment | Render.com (relay), local (admin/server) |
| CI | GitHub Actions |

---

## Development Commands

```bash
npm test                 # Run all Jest unit tests
npm run test:coverage    # Tests + coverage report
npm run build            # Compile server TypeScript → dist/
npm run build:client     # Compile client TypeScript → public/shared/
npm start                # Unified server (dist/server/index.js)
npm run start:admin      # Admin server (dist/server/admin-main.js)
npm run start:relay      # Relay server (dist/relay/relay-main.js)
npm run dev              # Compile + run relay + admin (uses .env)
npm run smoke            # Post-deploy smoke test against production relay
npm run smoke:local      # Smoke test against localhost:10000
```

`npm run dev` requires a `.env` file (not committed) with relay variables set.

**4-tab local integration test** (no setup required):
```
Tab 1:  /admin/trivia?demo=true&debug=true
Tab 2:  /broadcast/trivia?session=demo
Tab 3:  /play?session=demo&name=Alice
Tab 4:  /play?session=demo&name=Bob
```

---

## Environment Variables

| Variable | Used By | Description |
|---|---|---|
| `PORT` | All servers | Listen port (default: 3000 for server/admin, 10000 for relay) |
| `RELAY_URL` | Admin server | WebSocket URL of the relay (`ws://host:port`) |
| `RELAY_SECRET` | Admin server + relay | Shared secret for relay authentication |

---

## URL Routes

| URL | Purpose |
|---|---|
| `/admin` | Redirects to `/admin/trivia` |
| `/admin/trivia` | Trivia setup (CSV import) + live controller |
| `/play` | Trivia player join |
| `/broadcast/trivia` | Trivia broadcast screen |

### Query Parameters

| Parameter | Effect |
|---|---|
| `?demo=true` | Pre-loads fixture data (skips CSV import / word entry) |
| `?debug=true` | Shows collapsible session state JSON panel |
| `?speed=true` | Reduces 10s timer to 3s for rapid testing |
| `?session=demo&name=Alice` | Auto-joins on `/play` — skips name entry form |

---

## Game Mode

### Trivia

Elimination quiz. Admin imports questions via CSV. Each question has a 10s countdown; wrong or no answer eliminates the player. Surviving players advance. Last survivor(s) win.

State machine: `waiting → question_preview → question_live → breakdown → answer_revealed → survivors → game_over`

Full specification: **`product/teams-trivia-spec.md`**

Key files: `src/core/games/trivia/trivia-game.ts`, `src/core/games/trivia/trivia-round.ts`, `src/core/games/trivia/csv-parser.ts`

---

## Core Architecture (`src/core/`)

No I/O dependencies. All classes are instantiated by the server layer.

### `types.ts`
All shared types. Read this first. Key types:
- `TriviaState` — `waiting | question_preview | question_live | breakdown | answer_revealed | survivors | game_over`
- `TriviaQuestion`, `AnswerOption`, `AnswerCounts`, `RoundResult`, `TriviaWinner`
- `Player`, `PlayerScore`
- Event types: `PlayerJoinedEvent`, `PlayerLeftEvent`

### `Session` (`session.ts`)
Manages player roster and event listeners. Constructor accepts `('trivia', [])` signature.

### `TriviaGame` / `TriviaRound` / `CsvParser`
See `src/core/games/trivia/`. `TriviaGame` owns the state machine. `TriviaRound` tracks per-question answers and elimination. `CsvParser` validates and parses CSV uploads (min 3, max 15 questions).

---

## WebSocket Protocol (`src/server/protocol.ts`)

All messages are JSON. The file defines discriminated union types for all commands and events.

### Client → Server (commands)

```json
// Session
{ "type": "create_session", "questions": [...], "speed": false }
{ "type": "join", "screenName": "Alice" }

// Admin
{ "type": "start_trivia_question", "questionIndex": 0 }
{ "type": "go_live" }
{ "type": "advance_question" }

// Player
{ "type": "submit_answer", "answer": "B" }
{ "type": "register_spectator" }
```

### Server → Client (events)

```json
// Shared
{ "type": "session_created", "sessionId": "..." }
{ "type": "joined", "playerId": "...", "screenName": "Alice", "gameStatus": "no_game", "round": 0 }
{ "type": "player_joined", "playerId": "...", "screenName": "Carol", "playerCount": 3 }
{ "type": "player_left", "playerId": "...", "screenName": "Dave", "playerCount": 2 }
{ "type": "error", "message": "..." }

// Trivia — broadcast to all
{ "type": "question_preview", "questionIndex": 0, "text": "..." }
{ "type": "question_live", "text": "...", "options": ["A","B","C","D"], "timeLimit": 10 }
{ "type": "timer_expired" }
{ "type": "answer_breakdown", "counts": {"A":4,"B":12,"C":2,"D":1}, "totalAnswered": 19, "totalPlayers": 20 }
{ "type": "answer_revealed", "correct": "B", "eliminated": ["id1"], "survivors": ["id2"] }
{ "type": "survivors_regrouped", "survivorCount": 12, "survivorNames": ["Alice", ...] }
{ "type": "game_over", "winners": ["Alice", "Bob"] }

// Trivia — individual player
{ "type": "answer_accepted" }
{ "type": "you_survived", "survivorCount": 12 }
{ "type": "you_are_eliminated", "correctAnswer": "B", "yourAnswer": "A" }

// Trivia — admin only
{ "type": "live_answer_stats", "counts": {"A":1,"B":2,"C":0,"D":0}, "answered": 3, "remaining": 17 }
{ "type": "question_result", "correct": "B", "eliminated": [...], "survivors": [...] }
```

---

## Relay Protocol (`src/relay/relay-protocol.ts`)

Transport-only — no game-mode awareness. Admin authenticates with `RELAY_SECRET`.

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

### Unit tests (`npm test`)

Tests live in `__tests__/` subdirectories next to the source they test. Always run before committing.

```
src/core/__tests__/session.test.ts
src/core/__tests__/trivia-game.test.ts
src/core/__tests__/trivia-round.test.ts
src/core/__tests__/csv-parser.test.ts
src/client/__tests__/state.test.ts
src/client/__tests__/ui.test.ts
src/client/__tests__/handlers.test.ts
src/client/__tests__/ws-client.test.ts
src/client/__tests__/trivia-handlers.test.ts
src/relay/__tests__/relay-handler.test.ts
src/relay/__tests__/relay-protocol.test.ts
src/relay/__tests__/version-handler.test.ts
src/server/__tests__/ws-handler.test.ts
src/server/__tests__/admin-ws-handler.test.ts
src/server/__tests__/admin-relay-client.test.ts
src/server/__tests__/protocol.test.ts
src/server/__tests__/http-server.test.ts
```

When adding new mechanics or protocol messages, add tests in the corresponding `__tests__` file. Follow the existing `describe/it` structure.

### E2E tests (`npx playwright test`)

Playwright tests in `e2e/`. Run locally against a running server. Not part of `npm test` — run separately or via CI.

### Smoke test (`npm run smoke`)

`scripts/smoke-test.js` hits the production relay's `/version` endpoint to verify the deployed SHA matches the expected commit. Runs automatically in CI after tests pass on `main`.

---

## openspec Workflow

`openspec/` is a structured change-management system. Each significant change gets its own directory under `openspec/changes/` containing:

- `proposal.md` — the what and why
- `design.md` — technical design decisions
- `specs/` — per-feature spec files
- `tasks.md` — implementation checklist

When a change is merged, its directory moves to `openspec/changes/archive/` and the canonical specs are promoted to `openspec/specs/`.

**When creating an openspec change, always include this task in `tasks.md`:**
```markdown
- [ ] Update CLAUDE.md if directory structure, protocol messages, URL routes, or dev commands changed
```

---

## Coding Conventions

- **TypeScript strict mode** — no `any`, no implicit returns, exhaustive union handling
- **Discriminated unions** — all protocol messages and game types use a `type` or `envelope` field as discriminant
- **Factory methods over constructors** — `createWsHandler()`, `createAdminWsHandler()`, etc.
- **Pure core layer** — `src/core/` has zero I/O dependencies; all side effects live in `src/server/` and `src/client/`
- **State machine enforcement** — actions on wrong states are no-ops or return errors; never silently corrupt state
- **Observer pattern** — `Session.addEventListener()` is the hook for server handlers; don't call server code from core
- **No `console.log` in tests** — use `jest.spyOn` to suppress or assert on output

---

## Key Design Patterns

- **Transport abstraction**: `AdminWsHandler` uses a `RelayTransport` interface so it works identically whether connected locally or via relay.
- **Client module separation**: `src/client/` compiles to `public/shared/` via `tsconfig.client.json`. Each module is independently testable with jest-environment-jsdom.
- **Demo mode**: `?demo=true` loads fixtures from `src/fixtures/` so a full game can be run in 4 browser tabs with no manual setup.

---

## Adding New Features — Typical Workflow

1. Create an openspec change directory if the feature is significant
2. **Update `src/core/types.ts`** if new data shapes are needed
3. **Update core logic** in `src/core/games/` (new game) or existing game files
4. **Update `src/server/protocol.ts`** if new client↔server messages are needed
5. **Update handlers** in `src/server/ws-handler.ts` and/or `src/server/admin-ws-handler.ts`
6. **Update relay protocol** in `src/relay/relay-protocol.ts` only if relay envelope changes are needed (rare)
7. **Update `src/client/`** if the player or admin UI needs new logic
8. **Add/update tests** in all relevant `__tests__` directories
9. **Run `npm test`** — all tests must pass
10. **Run `npm run build && npm run build:client`** — both must compile cleanly
11. Update `public/` HTML files if the frontend needs changes
12. **Update this file (CLAUDE.md)** if you changed directory structure, protocol, URL routes, or dev commands

---

## CI/CD

- **CI** (`test.yml`): GitHub Actions runs `npm ci && npm test` on every push/PR to `main`. Node 18, Ubuntu.
- **E2E** (`e2e.yml`): Playwright smoke test runs after CI passes on `main`. Hits `https://townhall-games.onrender.com/version` and checks the deployed SHA.
- **Deployment**: Render.com deploys the relay server (`npm run start:relay`), port 10000, Frankfurt. Build: `npm install && npm run build`. Secrets via Render environment group `town-hall-games`.
