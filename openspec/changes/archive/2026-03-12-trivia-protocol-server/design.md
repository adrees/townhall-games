## Context

Phase 2 delivered `TriviaGame`, `TriviaRound`, and `CsvParser` as pure, I/O-free classes. They are tested in isolation but completely disconnected from the network. Phase 3 wires them into the existing WebSocket infrastructure.

The existing server layer has two handler paths — `ws-handler.ts` (unified local mode, one WS connection for both admin and players) and `admin-ws-handler.ts` (distributed mode, admin connects directly while players arrive via relay). Both handlers currently hardcode `new Session('bingo', ...)` and have no trivia dispatch. The relay itself is untouched — it is transport-only.

Existing `protocol.ts` defines a `Command` union and `ServerEvent` union with Bingo types only. `parseCommand` is a switch on `type`, and `serializeEvent` is a plain `JSON.stringify`.

## Goals / Non-Goals

**Goals:**
- Extend `protocol.ts` with Trivia command and event types; extend `parseCommand` and `serializeEvent`
- Add `submit_answer` player command and all server broadcast/per-player/admin-only event types
- Make both handlers (`ws-handler.ts` and `admin-ws-handler.ts`) dispatch on `session.gameMode`
- Implement server-side auto-sequencing timer (question live → breakdown at t=0; reveal after 2500ms)
- Stream `live_answer_stats` to admin on every player answer submission
- All existing Bingo behaviour and tests must pass unchanged

**Non-Goals:**
- Trivia session creation from admin (Phase 4/5 concern — admin UI handles CSV upload and session setup)
- Relay protocol changes
- Player or broadcast UI (Phases 4–6)
- Timer cancellation / reconnection handling (out of scope V1)

## Decisions

### D1: Extend protocol.ts in-place; keep single `Command` and `ServerEvent` unions

All Trivia types are appended to the existing `Command` and `ServerEvent` discriminated unions. `parseCommand` gains new `case` branches; `serializeEvent` remains a plain `JSON.stringify` (no changes needed — TypeScript discriminates at the call site).

**Alternative considered:** Separate `trivia-protocol.ts` with its own parse/serialise. Rejected — split unions would require callers to handle two types, complicating handlers. A single union with exhaustive `type` checks is simpler and consistent with the existing pattern.

**`submit_answer` validation:** `parseCommand` validates that the `answer` field is one of `'A'|'B'|'C'|'D'`. Invalid values return `null` (same pattern as other validation in `parseCommand`).

### D2: Both handlers get a `dispatchTriviaAdminCommand` / `dispatchTriviaPlayerCommand` helper

Rather than inlining trivia logic into the existing switch statements (which would make them very long), each handler extracts a `handleTriviaAdminCommand` function and a `handleTriviaPlayerCommand` function. The top-level switch branches on `session.gameMode`:

```
switch (session.gameMode) {
  case 'trivia': return handleTriviaAdminCommand(command);
  case 'bingo':  return handleBingoAdminCommand(command);  // existing logic
}
```

**Alternative considered:** Single flat switch with inline gameMode checks per command type. Rejected — mixes concerns and makes it easy to accidentally let a bingo command run in trivia mode.

### D3: TriviaGame instance lives alongside Session inside each handler closure

Each handler closure that currently holds `session: Session | null` gains `triviaGame: TriviaGame | null`. The `TriviaGame` is created when the session is created with `gameMode: 'trivia'` (initially with an empty question array — the admin will configure it via the setup flow in Phase 5). For Phase 3 integration tests / demo mode, questions can be pre-loaded from the fixture CSV.

**Alternative considered:** Store `TriviaGame` inside `Session`. Rejected — `Session` is generic infrastructure (player roster, scores, events) and should not know about game-specific logic. Keeping `TriviaGame` in the handler scope mirrors how `BingoGame` is already held by `Session` but separate from the handler closure.

### D4: Server-side timer is a plain `setTimeout` in the handler, not inside TriviaGame

When `go_live` is received, the handler starts a `setTimeout` for `TriviaGame.questionTimeLimitMs`. On expiry:
1. Call `game.expireTimer()` → state becomes `breakdown`
2. Broadcast `timer_expired` + `answer_breakdown` (counts at this moment)
3. Schedule a second `setTimeout(TriviaGame.REVEAL_DELAY_MS)`:
   - Call `game.revealAnswer()` → state becomes `answer_revealed`
   - Broadcast `answer_revealed` + per-player `you_are_eliminated`/`you_survived`
   - Send `question_result` to admin
   - Call `game.showSurvivors()` → state becomes `survivors` or `game_over`
   - Broadcast `survivors_regrouped` or `game_over`

The timer `NodeJS.Timeout` handle is stored in the closure so it can be cancelled if needed in future (V1 does not cancel it). `speedMode` is passed at game construction; `questionTimeLimitMs` is used as the first timeout value.

**Alternative considered:** Push timer logic into `TriviaGame` via a callback parameter. Rejected — timers are I/O and `TriviaGame` is intentionally pure. Handler owns I/O; core owns state.

### D5: `live_answer_stats` sent to admin only, on every `submit_answer`

After `TriviaRound.submitAnswer` is called, the handler immediately calls `round.getAnswerCounts()` and sends a `live_answer_stats` event to the admin socket only (not broadcast). `remaining` is `totalPlayers - totalAnswered` where `totalPlayers` is the survivor count at the start of the round.

### D6: `you_are_eliminated` carries `yourAnswer: AnswerOption | null`

Players who did not answer receive `you_are_eliminated` with `yourAnswer: null`. This is typed as `AnswerOption | null` in the protocol interface, which cleanly distinguishes non-answer from wrong-answer without a sentinel string.

### D7: No trivia session creation in Phase 3

Both handlers still create sessions with `new Session('bingo', ...)` via `create_session`. A `create_trivia_session` admin command will be added in Phase 5 (admin UI). For Phase 3 testability, tests construct `TriviaGame` directly in handler scope or use demo fixture loading; the handler integration tests use a `gameMode: 'trivia'` session injected via a test factory.

## Risks / Trade-offs

- **Risk: Timer fires after test assertion** — In tests, use Jest fake timers (`jest.useFakeTimers()`) to control `setTimeout` deterministically. Document this pattern in the test file.

- **Risk: Concurrent answer and timer expiry** — `TriviaRound.submitAnswer` after `close()` is already a no-op (Phase 2 spec), so a race between the last answer and `expireTimer()` is safe. The timer path always wins for state transitions.

- **Risk: Admin disconnect during a live question** — Timer will still fire and broadcast; with no admin socket the events are simply not delivered to admin. Players still see the full reveal sequence. Acceptable for V1 (out-of-scope per spec section 11).

- **Trade-off: Flat `Command` union grows large** — Adding 4 trivia commands and 12 event types to protocol.ts makes the file longer. The alternative (splitting by game mode) introduces more import complexity. Accepted for V1.

## Open Questions

- **How does the trivia session get its questions in Phase 3?** The admin UI (Phase 5) will send a `create_trivia_session` command with a CSV payload. For Phase 3, tests inject a pre-built `TriviaGame` with fixture questions. Handlers need a way to accept an externally constructed `TriviaGame` — a test factory parameter or a `setTriviaGame(game)` method on the handler. **Decision:** expose an optional `triviaGame` parameter in the `createWsHandler` / `createAdminWsHandler` factory functions, defaulting to `null`.
