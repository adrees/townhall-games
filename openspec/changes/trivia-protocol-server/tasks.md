## 1. Protocol types

- [x] 1.1 Add trivia admin command interfaces to `src/server/protocol.ts`: `StartTriviaQuestionCommand` (`type`, `questionIndex: number`), `GoLiveCommand` (`type`), `AdvanceQuestionCommand` (`type`)
- [x] 1.2 Add `SubmitAnswerCommand` player command interface (`type`, `answer: AnswerOption`)
- [x] 1.3 Add broadcast event interfaces: `QuestionPreviewEvent`, `QuestionLiveEvent` (`text`, `options`, `timeLimit`), `TimerExpiredEvent`, `AnswerBreakdownEvent` (`counts`, `totalAnswered`, `totalPlayers`), `AnswerRevealedEvent` (`correct`, `eliminated`, `survivors`), `SurvivorsRegroupedEvent` (`survivorCount`, `survivorNames`), `GameOverEvent` (`winners`)
- [x] 1.4 Add per-player event interfaces: `YouAreEliminatedEvent` (`correctAnswer`, `yourAnswer: AnswerOption | null`), `YouSurvivedEvent` (`survivorCount`), `AnswerAcceptedEvent`
- [x] 1.5 Add admin-only event interfaces: `LiveAnswerStatsEvent` (`counts`, `answered`, `remaining`), `QuestionResultEvent` (`correct`, `eliminated`, `survivors`)
- [x] 1.6 Extend `Command` union to include the four new trivia command types
- [x] 1.7 Extend `ServerEvent` union to include all twelve new trivia event types

## 2. Protocol parsing and serialisation

- [x] 2.1 Extend `parseCommand` switch to handle `start_trivia_question` — validate `questionIndex` is a number, return typed command or `null`
- [x] 2.2 Extend `parseCommand` to handle `go_live` and `advance_question` (no payload validation needed)
- [x] 2.3 Extend `parseCommand` to handle `submit_answer` — validate `answer` is one of `A|B|C|D`, return typed command or `null`
- [x] 2.4 Add the four new command type strings to the `COMMAND_TYPES` set so `parseCommand` does not reject them before the switch

## 3. Protocol tests

- [x] 3.1 In `src/server/__tests__/protocol.test.ts`, add tests for `start_trivia_question` parse — valid, missing `questionIndex`, non-numeric `questionIndex`
- [x] 3.2 Add tests for `go_live` and `advance_question` parse — valid inputs
- [x] 3.3 Add tests for `submit_answer` parse — valid A/B/C/D (including lowercase), invalid value `E`, missing field
- [x] 3.4 Add serialisation round-trip tests for each of the 12 new server event types (one `serializeEvent` → `JSON.parse` → field check per type)

## 4. Handler factory signature

- [x] 4.1 Add optional `triviaGame?: TriviaGame | null` parameter to `createWsHandler` factory in `src/server/ws-handler.ts`; store in closure as `let triviaGame: TriviaGame | null`
- [x] 4.2 Add optional `triviaGame?: TriviaGame | null` parameter to `createAdminWsHandler` factory in `src/server/admin-ws-handler.ts`; store in closure

## 5. ws-handler.ts — trivia dispatch

- [x] 5.1 Extract existing Bingo admin command handling into a `handleBingoAdminCommand(command)` inner function (refactor, no behaviour change)
- [x] 5.2 Add `handleTriviaAdminCommand(command)` inner function routing `start_trivia_question`, `go_live`, and `advance_question` to the `triviaGame` instance; return error event if `triviaGame` is null
- [x] 5.3 Branch the top-level admin command dispatch on `session.gameMode`: `'trivia'` → `handleTriviaAdminCommand`, `'bingo'` → `handleBingoAdminCommand`; unknown game mode → error
- [x] 5.4 Add `handleTriviaPlayerCommand(ws, command)` inner function routing `submit_answer` to `triviaGame.getCurrentRound()?.submitAnswer()`; send `answer_accepted` to player; send `live_answer_stats` to admin socket; silently ignore if not in `question_live`
- [x] 5.5 Add `handleBingoPlayerCommand(ws, command)` wrapping existing `join` and `mark_word` logic
- [x] 5.6 Branch player command dispatch on `session.gameMode`; trivia session receiving bingo-only command returns error; bingo session receiving trivia command returns error

## 6. ws-handler.ts — auto-sequencing timer

- [x] 6.1 On `go_live` success, start a `setTimeout(onTimerExpired, triviaGame.questionTimeLimitMs)` and store the handle in the closure
- [x] 6.2 Implement `onTimerExpired`: call `triviaGame.expireTimer()`, broadcast `timer_expired`, broadcast `answer_breakdown` with current round counts
- [x] 6.3 Schedule `setTimeout(onReveal, TriviaGame.REVEAL_DELAY_MS)` inside `onTimerExpired`
- [x] 6.4 Implement `onReveal`: call `triviaGame.revealAnswer()`, broadcast `answer_revealed`, send per-player `you_are_eliminated`/`you_survived`, send `question_result` to admin, call `triviaGame.showSurvivors()`, broadcast `survivors_regrouped` or `game_over`

## 7. admin-ws-handler.ts — trivia dispatch and timer

- [x] 7.1 Mirror tasks 5.1–5.6 for `admin-ws-handler.ts` (admin commands via direct WS, player commands via `handlePlayerCommand`)
- [x] 7.2 Mirror tasks 6.1–6.4 for `admin-ws-handler.ts` (timer sends to relay via `broadcastToAll` / `sendToPlayer` / `sendToAdmin`)

## 8. ws-handler tests

- [x] 8.1 In `src/server/__tests__/ws-handler.test.ts`, add test: trivia admin sends `start_trivia_question` → game transitions to `question_preview`, `question_preview` event broadcast
- [x] 8.2 Add test: trivia admin sends `go_live` → `question_live` broadcast with text, options, timeLimit
- [x] 8.3 Add test: player sends `submit_answer` during `question_live` → `answer_accepted` to player, `live_answer_stats` to admin
- [x] 8.4 Add test (fake timers): timer expires → `timer_expired` + `answer_breakdown` broadcast; after `REVEAL_DELAY_MS` → `answer_revealed` broadcast, per-player events sent
- [x] 8.5 Add test: trivia admin sends `advance_question` from `survivors` → `question_preview` broadcast
- [x] 8.6 Add test: bingo command (`mark_word`) sent to trivia session → `error` event, state unchanged
- [x] 8.7 Add test: trivia command (`go_live`) sent to bingo session → `error` event, state unchanged

## 9. admin-ws-handler tests

- [x] 9.1 In `src/server/__tests__/admin-ws-handler.test.ts`, add trivia admin command routing tests mirroring 8.1–8.2 for the relay-based handler
- [x] 9.2 Add test: player `submit_answer` via `handlePlayerCommand` → `answer_accepted` to player connection, `live_answer_stats` to admin socket
- [x] 9.3 Add test (fake timers): timer expiry and reveal sequence via relay transport (`broadcastToPlayers`, `sendToPlayer`)
- [x] 9.4 Add test: cross-mode command rejection (8.6–8.7 equivalents)

## 10. Verify

- [x] 10.1 Run `npm test` — all new tests pass; all existing Bingo and relay tests pass unchanged
- [x] 10.2 Run `npm run build` — TypeScript compiles cleanly with no errors
