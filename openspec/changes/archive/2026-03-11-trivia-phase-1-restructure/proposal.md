## Why

The `townhall-games` platform currently supports only Buzzword Bingo. To support Teams Trivia as a second game mode, the codebase must be restructured so game-specific logic lives under a shared `games/` directory, URL routing is formalised, and the platform has a `gameMode` discriminant that all downstream handlers can branch on.

## What Changes

- **BREAKING** Move `src/core/bingo-card.ts` and `src/core/bingo-game.ts` into `src/core/games/bingo/` — all import paths updated accordingly
- **BREAKING** Move existing bingo word list into `src/fixtures/bingo-words.ts`
- Add `gameMode: 'bingo' | 'trivia'` field to `Session`
- Create empty skeleton directory `src/core/games/trivia/` (placeholder classes only — no logic)
- Add `src/server/routes.ts` implementing URL routing for `/admin`, `/admin/bingo`, `/admin/trivia`, `/play`, `/broadcast/trivia`
- Restructure `public/` to match the new URL layout (`admin/`, `broadcast/`, `play/` subdirectories)
- Add `src/fixtures/` directory with `trivia-questions.csv` (7 sample questions) for `?demo=true` handling
- Wire `?demo=true` query param at the routing layer (skeleton — no trivia logic yet)

## Capabilities

### New Capabilities
- `url-routing`: URL routing layer serving mode-specific admin, player, and broadcast pages with query param support (`?demo`, `?debug`, `?speed`, `?session`, `?name`)
- `game-mode-session`: `Session` gains a `gameMode` discriminant; downstream handlers can branch on `'bingo' | 'trivia'`

### Modified Capabilities
_(none — existing bingo requirements are unchanged; this is a structural relocation only)_

## Impact

- **`src/core/`**: `bingo-card.ts` and `bingo-game.ts` move to `src/core/games/bingo/`; `session.ts` gains `gameMode` field
- **`src/server/`**: new `routes.ts`; `http-server.ts` updated to serve new `public/` layout
- **`public/`**: directories reorganised — existing `index.html` (player) moves to `public/play/index.html`; `admin.html` moves to `public/admin/bingo.html`
- **All import paths** referencing moved files must be updated — including test files
- **No relay changes** — relay is transport-only and unaffected
- **All existing Bingo tests must pass** after restructure — this is the acceptance criterion for Phase 1
