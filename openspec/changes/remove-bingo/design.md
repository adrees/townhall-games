## Context

The platform currently supports two game modes: Buzzword Bingo and Teams Trivia. Mode selection flows top-down through every layer — `Session.gameMode`, `ws-handler` branching, protocol discriminants, client HTML, and types. Bingo is being paused; keeping its code in the shared path adds cognitive overhead and coupling that slows trivia work.

A safety net is in place: trivia-mode unit tests were added to `session.test.ts` and `ws-handler.test.ts` before this change (PR #TBD), and 3 e2e tests cover the core player flow end-to-end.

## Goals / Non-Goals

**Goals:**
- Reduce the codebase to a single game mode (trivia)
- Simplify all shared layers: Session, types, protocol, ws-handler, client modules, HTML
- Keep all existing trivia tests green throughout
- Leave no dead code or commented-out bingo paths

**Non-Goals:**
- Changing any trivia game logic or behaviour
- Modifying the relay — it is transport-only and has no game-mode awareness
- Preserving bingo at runtime — git history is the recovery mechanism

## Decisions

### Delete bingo files entirely rather than feature-flagging

Keeping bingo behind a flag leaves dead code that rots and still requires maintaining the branching. A clean delete with git as the recovery mechanism is simpler and more honest about the intent to pause, not retire.

### Simplify Session to a plain player roster, remove gameMode field

`Session` currently carries `gameMode: 'bingo' | 'trivia'` and a `wordList`. After removal, it becomes a thin player-roster class (add/remove players, emit events, track scores) with no game-mode concept. `TriviaGame` is constructed independently by the server layer, as it is today.

Alternative considered: keep `gameMode` as `'trivia'` only. Rejected — a single-value union adds noise with no benefit.

### Drop gameMode from create_session protocol command

Currently `create_session` is a discriminated union on `gameMode`. With only one mode, the discriminant is meaningless. The command becomes `{ type: 'create_session', questions: [...], speed?: boolean }`. This is a breaking protocol change but there are no external consumers — admin and player are both served from the same codebase.

### Remove WinPattern, MarkResult, Winner from types.ts

These types exist solely for bingo. Removing them eliminates the bingo import chain from `types.ts` → `session.ts` → `ws-handler.ts`. The trivia-specific types (`TriviaState`, `TriviaQuestion`, `AnswerCounts`, etc.) remain untouched.

### Remove GameStartedEvent and NewRoundStartedEvent from the event system

Both events carry a `BingoCard` reference and are only emitted by the bingo path in `Session`. After removal, the `GameEvent` union shrinks to `PlayerJoinedEvent | PlayerLeftEvent`. The `ws-handler` session event listener simplifies accordingly.

### Simplify ws-handler routing — remove handleBingoAdminCommand and handleBingoPlayerCommand

The handler currently branches on `session.gameMode` to route to four handlers. After removal: one admin handler (trivia), one player handler (trivia), no branching. The `create_session` path directly creates a trivia session without checking gameMode.

### Simplify player UI — /play becomes trivia-only

`public/play/index.html` currently has both `#bingoGrid / #playingSection` (bingo) and `#triviaSection` (trivia) sections. The bingo sections are removed. The trivia sections remain. `public/shared/handlers.js` loses the bingo mark_result / card_dealt / player_won / leaderboard handling.

## Risks / Trade-offs

- **Tests anchored to bingo helpers break** → `connectAdmin()` in ws-handler.test.ts currently creates a bingo session. It must be updated to trivia before deleting bingo. The new trivia-mode tests added pre-change provide the safety net.
- **session.test.ts becomes mostly invalid** → Most tests use `new Session('bingo', wordList)`. These must be deleted; the replacement trivia-mode describe block was pre-added and will remain.
- **Admin index.html game-mode selector becomes redundant** → `/admin` redirects or goes directly to `/admin/trivia`. Simple — either redirect or replace the selector page content.

## Migration Plan

Suggested deletion order to keep tests passing at each step:

1. Update `connectAdmin()` helper in `ws-handler.test.ts` to use trivia (makes bingo tests fail — delete them in same commit)
2. Delete `src/core/games/bingo/` and tests
3. Simplify `src/core/types.ts` — remove bingo types
4. Simplify `src/core/session.ts` — remove gameMode, wordList, BingoGame
5. Simplify `src/server/protocol.ts` — remove bingo commands/events
6. Simplify `src/server/ws-handler.ts` — remove bingo handlers, simplify routing
7. Simplify `src/client/` — remove bingo message handlers from handlers.ts and state.ts
8. Update `public/` HTML — delete bingo.html, simplify index.html and play/index.html
9. Delete `src/fixtures/bingo-words.ts`
10. Run `npm test && npm run build && npm run build:client`
11. Run Playwright e2e tests
12. Update CLAUDE.md

## Open Questions

None — scope is clear, safety net is in place.
