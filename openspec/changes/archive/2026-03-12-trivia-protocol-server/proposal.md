## Why

The Trivia Core (Phase 2) is complete but entirely disconnected from the network. Phase 3 wires it up: extending the WebSocket protocol with Trivia message types and updating the server handlers so a real game can be driven over the existing relay infrastructure.

## What Changes

- Extend `src/server/protocol.ts` with all Trivia-specific message types from spec section 8:
  - Admin → Server: `start_trivia_question`, `go_live`, `advance_question`
  - Server → All Players: `question_preview`, `question_live`, `timer_expired`, `answer_breakdown`, `answer_revealed`, `survivors_regrouped`, `game_over`
  - Server → Individual Player: `you_are_eliminated`, `you_survived`, `answer_accepted`
  - Server → Admin: `live_answer_stats`, `question_result`
- Extend `src/server/ws-handler.ts` to route trivia player commands (`submit_answer`, `join`) and broadcast trivia state events to connected players
- Extend `src/server/admin-ws-handler.ts` to handle `start_trivia_question`, `go_live`, and `advance_question`; stream `live_answer_stats` to the admin during `question_live`
- Implement server-side auto-sequencing timer: on `expireTimer()`, schedule `revealAnswer()` after `TriviaGame.REVEAL_DELAY_MS` (2500ms); then broadcast `survivors_regrouped`
- Add `submit_answer` player command with `AnswerOption` payload
- Verify relay requires no changes (transport-only, game-mode agnostic)

## Capabilities

### New Capabilities
- `trivia-protocol`: All Trivia WebSocket message types — admin commands, broadcast events, per-player events, admin stats — and their parse/serialise contract
- `trivia-server`: Server-side Trivia game orchestration — handler routing, auto-sequencing timer, per-player answer tracking, admin stats streaming

### Modified Capabilities
- `game-mode-session`: Session now branches on `gameMode` to route to Trivia or Bingo handlers (requirement change — session must expose `gameMode` to handlers)

## Impact

- `src/server/protocol.ts` — new Trivia command and event types appended; `parseCommand` and `serializeEvent` extended
- `src/server/ws-handler.ts` — gameMode-aware dispatch; trivia player message routing
- `src/server/admin-ws-handler.ts` — trivia admin command routing; timer scheduling
- `src/server/__tests__/protocol.test.ts` — new test cases for trivia parse/serialise
- `src/server/__tests__/ws-handler.test.ts` — trivia player interaction tests
- `src/server/__tests__/admin-ws-handler.test.ts` — trivia admin command tests
- No changes to relay, relay-protocol, or BingoGame
