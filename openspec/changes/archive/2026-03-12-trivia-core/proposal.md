## Why

The platform restructure (Phase 1) created the skeleton for Trivia but left `src/core/games/trivia/` empty. Phase 2 fills in the game logic — the pure, I/O-free core that all server and UI layers will depend on. Without it, no further trivia phases can begin.

## What Changes

- Introduce `TriviaGame` — a six-phase state machine (`waiting → question_preview → question_live → breakdown → answer_revealed → survivors → game_over`)
- Introduce `TriviaRound` — per-question answer collection, no-answer elimination tracking, and correct/incorrect resolution
- Introduce `CsvParser` — validates and parses CSV question files (3–15 questions, required columns, no duplicates)
- Add server-side auto-sequencing timer: `question_live → breakdown` at t=0; `breakdown → answer_revealed` after 2.5s fixed delay
- Write Jest unit tests covering all state transitions, elimination rules, multiple-winner detection, and all CSV validation error cases

## Capabilities

### New Capabilities
- `trivia-core`: The `TriviaGame` state machine, `TriviaRound` answer/elimination logic, and `CsvParser` validation — pure game logic with no I/O dependencies

### Modified Capabilities
(none — `game-mode-session` and `url-routing` specs are unchanged by this phase)

## Impact

- New files: `src/core/games/trivia/trivia-game.ts`, `trivia-round.ts`, `csv-parser.ts`
- New fixture: `src/fixtures/trivia-questions.csv` (7 sample questions for demo/test)
- New tests: `src/core/__tests__/trivia-game.test.ts`, `trivia-round.test.ts`, `csv-parser.test.ts`
- No changes to existing Bingo logic, relay, or server handlers
- All existing tests must continue to pass
