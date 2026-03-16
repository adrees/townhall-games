## Why

When every player is eliminated in a round, the game currently continues — the admin can advance to the next question with no one left to play. This produces a confusing dead state: questions cycle for an empty room with no possible winner. The game should end immediately when all players are eliminated.

## What Changes

- When `showSurvivors()` is called and the survivor count is zero, the game SHALL transition to `game_over` regardless of whether more questions remain.
- The server SHALL detect this condition and broadcast `game_over` (with an empty `winners` array), skipping the survivors screen.
- The admin UI advance flow is unaffected — the state machine enforces the transition; the server reacts to `game_over` state as it already does.

## Non-goals

- Changing what happens when survivors reach zero mid-question (that is already handled by elimination logic).
- Adding a "no winners" UI treatment beyond the existing empty-winners `game_over` broadcast.
- Changing any other `game_over` trigger (e.g., last question answered).

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `trivia-core`: `showSurvivors()` must transition to `game_over` when survivor count is zero, not only when questions are exhausted.
- `trivia-server`: The server's `showSurvivors` handling must broadcast `game_over` whenever the resulting state is `game_over`, not only on the final question.

## Impact

- `src/core/games/trivia/trivia-game.ts` — `showSurvivors()` transition logic
- `src/server/ws-handler.ts` and/or `src/server/admin-ws-handler.ts` — post-survivors broadcast path
- `src/core/__tests__/trivia-game.test.ts` — new scenario for all-eliminated mid-game
- `src/server/__tests__/ws-handler.test.ts` — new scenario for early game_over broadcast
