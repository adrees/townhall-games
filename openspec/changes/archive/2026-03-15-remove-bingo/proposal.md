## Why

Buzzword Bingo is being paused so development focus can concentrate on Teams Trivia. Its presence in the shared codebase adds noise and branching that slows trivia work. Removing it now simplifies the platform to a single mode and makes the code easier to reason about.

## What Changes

- **BREAKING** Remove `gameMode: 'bingo'` from all protocol messages and session construction
- Delete `src/core/games/bingo/` (BingoCard, BingoGame) and their tests
- Delete `src/fixtures/bingo-words.ts` and `public/admin/bingo.html`
- Simplify `Session` to trivia-only (drop gameMode field, word list, BingoGame references)
- Simplify `src/core/types.ts` — remove WinPattern, MarkResult, Winner, and bingo-specific event types
- Simplify `src/server/protocol.ts` — remove bingo command/event variants
- Simplify `src/server/ws-handler.ts` — remove bingo admin/player command handlers and gameMode branching
- Simplify `public/admin/index.html` — remove game mode selector (trivia only)
- Simplify `public/play/index.html` — remove bingo-specific sections (bingoGrid, leaderboard, winBanner, playingSection)
- Update CLAUDE.md to reflect single-mode platform

## Capabilities

### New Capabilities

None — this is a removal, not an addition.

### Modified Capabilities

- `trivia-server`: Session construction and ws-handler routing simplify to trivia-only; `create_session` command drops the `gameMode` discriminant

## Non-goals

- Not modifying any trivia game logic or behaviour
- Not archiving git history — bingo code remains recoverable via git log
- Not rebuilding bingo — the game spec is preserved in `product/bingo-spec.md` for future revival

## Impact

- `src/core/session.ts` — significant simplification; loses gameMode, wordList, BingoGame, bingo-specific event handling
- `src/core/types.ts` — WinPattern, MarkResult, Winner, GameStartedEvent, NewRoundStartedEvent removed
- `src/server/protocol.ts` — bingo command and event types removed
- `src/server/ws-handler.ts` — handleBingoAdminCommand, handleBingoPlayerCommand removed; routing simplified
- `src/client/handlers.ts`, `src/client/state.ts` — bingo message handling removed
- `public/` HTML — bingo.html deleted; index.html and play/index.html simplified
- All bingo unit tests deleted; existing trivia-mode tests remain green
