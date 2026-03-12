## Context

Phase 1 restructured the codebase and created the directory skeleton at `src/core/games/trivia/`, with `trivia-game.ts` containing only an empty `export class TriviaGame {}`. The existing `BingoGame` in `src/core/games/bingo/bingo-game.ts` serves as the pattern to follow: a pure class with no I/O, enforcing a state machine, instantiated and driven by the server layer.

This phase adds three new pure classes alongside the existing Bingo logic, then covers them with Jest unit tests following the existing `src/core/__tests__/` conventions.

## Goals / Non-Goals

**Goals:**
- Implement `TriviaGame`, `TriviaRound`, and `CsvParser` as pure TypeScript classes (zero I/O, zero side effects)
- Add trivia types to `src/core/types.ts`
- Ship a `src/fixtures/trivia-questions.csv` fixture (7 questions) for demo/test use
- Full Jest unit test coverage for all three classes
- Zero regressions — all existing Bingo tests continue to pass

**Non-Goals:**
- WebSocket protocol or server handlers (Phase 3)
- Player/admin/broadcast UI (Phases 4–6)
- Session integration — `TriviaGame` is not wired into `Session` in this phase
- Auto-sequencing timers with real `setTimeout` — the timer boundary is modelled as a callable method (`expireTimer()`), actual scheduling belongs in the server layer

## Decisions

### D1: Three separate classes, not one monolith

`TriviaGame` owns the state machine and question sequence. `TriviaRound` owns per-question answer tracking and elimination resolution. `CsvParser` is a stateless parser/validator.

**Why not put everything in `TriviaGame`?** `TriviaRound` is instantiated fresh per question and can be tested exhaustively in isolation. `CsvParser` has no dependency on game state. Separation keeps each class small and independently testable — matching the `BingoCard` / `BingoGame` split already in the codebase.

**Alternative considered:** A single `TriviaGame` class with internal answer-tracking maps. Rejected because it conflates question-level lifecycle (open → closed → resolved) with game-level lifecycle (waiting → game_over), making tests more complex.

### D2: Timer boundary is a method call, not real time

`TriviaGame.expireTimer()` transitions state from `question_live → breakdown`. `TriviaGame.revealAnswer()` transitions `breakdown → answer_revealed`. The 2500ms delay between them is enforced by a constant (`REVEAL_DELAY_MS = 2500`) exposed for the server layer to use with `setTimeout` — but `TriviaGame` itself has no I/O.

**Why?** Keeps the core testable synchronously without fake timers. Matches the BingoGame pattern where `markWord()` is called by the server — the server drives transitions, the core enforces state validity.

### D3: `TriviaRound` roster is provided at construction

`new TriviaRound(questionIndex, correctAnswer, playerIds)` receives the full set of active player IDs up front. This lets `resolve()` identify no-answer players without needing a separate registration step.

**Alternative considered:** Calling `registerPlayer(id)` before closing. Rejected as more complex and error-prone — the server already has the survivor roster at question start.

### D4: New trivia types added to `src/core/types.ts`

`TriviaQuestion`, `TriviaState`, `AnswerOption`, `RoundResult` are added to the existing types file rather than a separate `trivia-types.ts`.

**Why?** Keeps the type surface in one place, consistent with how Bingo types are handled. Trivia types don't conflict with Bingo types.

### D5: `CsvParser` is a static-method class

`CsvParser.parse(csvString)` returns `TriviaQuestion[]` or throws a `CsvParseError` containing all collected errors.

**Alternative considered:** Instance-based parser with `new CsvParser(csv).parse()`. Rejected — no instance state is needed, a static method is simpler and matches the `BingoCard.generate()` factory pattern.

### D6: File structure

```
src/core/games/trivia/
  trivia-game.ts      ← TriviaGame
  trivia-round.ts     ← TriviaRound
  csv-parser.ts       ← CsvParser + CsvParseError
  index.ts            ← re-exports (already exists from Phase 1)

src/core/__tests__/
  trivia-game.test.ts
  trivia-round.test.ts
  csv-parser.test.ts

src/fixtures/
  trivia-questions.csv   ← 7 sample questions
```

`src/core/types.ts` gains trivia-specific types at the bottom of the file.

## Risks / Trade-offs

- **Risk: `TriviaGame` state machine grows complex** → Mitigation: keep each transition as a single guarded method; throw on invalid state rather than silently no-op (unlike BingoGame which sometimes returns early). This makes mis-sequenced calls immediately visible in tests.

- **Risk: CsvParser edge cases in real-world CSV (quoted commas, BOM, CRLF)** → Mitigation: V1 spec requires simple CSV only. Document that quoted-field CSV with embedded commas is not supported; validate with a minimal hand-rolled parser rather than pulling in a CSV library dependency. If this causes field-in-production pain, a library can be added in V2.

- **Trade-off: No real timer in core** → The server layer must schedule `setTimeout(game.revealAnswer.bind(game), TriviaGame.REVEAL_DELAY_MS)` after calling `expireTimer()`. This is a thin but real coupling; document it in code comments on `REVEAL_DELAY_MS`.

## Open Questions

- Should `TriviaGame` track eliminated player IDs across rounds (cumulative survivor set), or should the server layer maintain the survivor roster and pass it into each `TriviaRound`? **Tentative decision:** server passes survivor IDs into each new `TriviaRound`; `TriviaGame` holds a `survivorIds` set that it updates after each `resolve()`. This keeps the game queryable (`game.getSurvivors()`) without the server having to track it separately.
