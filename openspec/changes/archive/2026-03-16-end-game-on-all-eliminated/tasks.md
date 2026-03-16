## 1. Core Logic

- [x] 1.1 In `TriviaGame.showSurvivors()`, add `|| this._survivorIds.size === 0` to the `game_over` condition so the state transitions to `game_over` when all players are eliminated, even if questions remain

## 2. Tests

- [x] 2.1 In `src/core/__tests__/trivia-game.test.ts`, add a test: `showSurvivors()` transitions to `game_over` when all players are eliminated mid-game (questions still remaining)
- [x] 2.2 In `src/server/__tests__/ws-handler.test.ts`, add a test: server broadcasts `game_over` (empty winners) and does NOT broadcast `survivors_regrouped` when all players are eliminated before the final question

## 3. Verification

- [x] 3.1 Run `npm test` — all tests pass
- [x] 3.2 Run `npm run build && npm run build:client` — both compile cleanly
- [ ] 3.3 Manual smoke: 4-tab local integration test (`?demo=true&debug=true`), eliminate all players on a non-final question and confirm `game_over` screen appears without advancing to the next question
