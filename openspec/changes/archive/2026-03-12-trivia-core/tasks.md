## 1. Types

- [x] 1.1 Add `AnswerOption` (`'A' | 'B' | 'C' | 'D'`), `TriviaQuestion`, `TriviaState`, `RoundResult`, and `TriviaWinner` types to `src/core/types.ts`

## 2. CsvParser

- [x] 2.1 Create `src/core/games/trivia/csv-parser.ts` with `CsvParseError` class (holds `string[]` errors array) and static `CsvParser.parse(csv: string): TriviaQuestion[]`
- [x] 2.2 Implement header validation — reject if row is not exactly `question,a,b,c,d,correct` (case-insensitive)
- [x] 2.3 Implement row completeness check — reject rows with any empty column, report row numbers
- [x] 2.4 Implement `correct` column validation — must be A/B/C/D case-insensitive; normalise to uppercase on success
- [x] 2.5 Implement question count validation — reject if fewer than 3 or more than 15 data rows
- [x] 2.6 Implement duplicate question text detection — collect all duplicates before rejecting
- [x] 2.7 Ensure all errors are collected across the full file before throwing `CsvParseError`

## 3. TriviaRound

- [x] 3.1 Create `src/core/games/trivia/trivia-round.ts` — constructor accepts `(questionIndex: number, correctAnswer: AnswerOption, playerIds: string[])`
- [x] 3.2 Implement `submitAnswer(playerId, answer)` — record answer, silently ignore duplicates and post-close submissions
- [x] 3.3 Implement `close()` — mark round as closed, prevent further answer submissions
- [x] 3.4 Implement `resolve()` — compute `eliminated` (wrong answer or no answer) and `survivors` (correct answer); store as `RoundResult`
- [x] 3.5 Implement `getAnswerCounts()` — return `{ A, B, C, D }` counts from submitted answers
- [x] 3.6 Implement `getResult()` — return the resolved `RoundResult` (throw if not yet resolved)

## 4. TriviaGame

- [x] 4.1 Replace the empty stub in `src/core/games/trivia/trivia-game.ts` with full implementation — constructor accepts `(sessionId: string, questions: TriviaQuestion[], options?: { speedMode?: boolean })`
- [x] 4.2 Implement state property with initial value `waiting`; expose `static REVEAL_DELAY_MS = 2500` and `questionTimeLimitMs` (10000 normal, 3000 speed mode)
- [x] 4.3 Implement `previewQuestion(index)` — valid from `waiting` and `survivors`; transitions to `question_preview`
- [x] 4.4 Implement `goLive()` — valid from `question_preview`; creates a new `TriviaRound` with current survivors; transitions to `question_live`
- [x] 4.5 Implement `expireTimer()` — valid from `question_live`; calls `round.close()`; transitions to `breakdown`
- [x] 4.6 Implement `revealAnswer()` — valid from `breakdown`; calls `round.resolve()`; updates `survivorIds`; transitions to `answer_revealed`
- [x] 4.7 Implement `showSurvivors()` — valid from `answer_revealed`; transitions to `survivors` if questions remain, else `game_over`
- [x] 4.8 Implement illegal-transition guard — throw `Error` with descriptive message for any method called in wrong state
- [x] 4.9 Implement `getSurvivors()` returning current survivor player IDs; implement `getWinners()` returning winner names (populated at `game_over`)
- [x] 4.10 Update `src/core/games/trivia/index.ts` to re-export `TriviaGame`, `TriviaRound`, `CsvParser`, and `CsvParseError`

## 5. Fixture

- [x] 5.1 Create `src/fixtures/trivia-questions.csv` with 7 sample company-style questions (all columns populated, mix of correct answers A/B/C/D)

## 6. Unit Tests — CsvParser

- [x] 6.1 Create `src/core/__tests__/csv-parser.test.ts`; test valid CSV returns correct `TriviaQuestion[]`
- [x] 6.2 Test missing/wrong header is rejected with descriptive error
- [x] 6.3 Test each missing-column case reports the correct row number
- [x] 6.4 Test invalid `correct` value (e.g., `E`, `1`, empty) is rejected with row number
- [x] 6.5 Test fewer than 3 questions is rejected
- [x] 6.6 Test more than 15 questions is rejected
- [x] 6.7 Test duplicate question text is detected and reported
- [x] 6.8 Test multiple errors in one file are all reported together (not fail-fast)
- [x] 6.9 Test lowercase correct answer (e.g., `a`) is normalised to `A` in successful parse

## 7. Unit Tests — TriviaRound

- [x] 7.1 Create `src/core/__tests__/trivia-round.test.ts`; test answer accepted while open
- [x] 7.2 Test duplicate answer from same player is ignored (original retained)
- [x] 7.3 Test answer submitted after `close()` is ignored
- [x] 7.4 Test `resolve()` — players with wrong answer are eliminated
- [x] 7.5 Test `resolve()` — players who never answered are eliminated
- [x] 7.6 Test `resolve()` — players with correct answer appear in survivors
- [x] 7.7 Test `getAnswerCounts()` returns correct per-option totals
- [x] 7.8 Test `getResult()` throws before `resolve()` is called

## 8. Unit Tests — TriviaGame

- [x] 8.1 Create `src/core/__tests__/trivia-game.test.ts`; test initial state is `waiting`
- [x] 8.2 Test `previewQuestion()` from `waiting` → `question_preview`
- [x] 8.3 Test `previewQuestion()` from `survivors` → `question_preview`
- [x] 8.4 Test `goLive()` from `question_preview` → `question_live`
- [x] 8.5 Test `expireTimer()` from `question_live` → `breakdown`
- [x] 8.6 Test `revealAnswer()` from `breakdown` → `answer_revealed`
- [x] 8.7 Test `showSurvivors()` from `answer_revealed` → `survivors` when questions remain
- [x] 8.8 Test `showSurvivors()` from `answer_revealed` → `game_over` when no questions remain
- [x] 8.9 Test illegal transition throws and leaves state unchanged (e.g., `goLive()` in `waiting`)
- [x] 8.10 Test multiple winners: all last survivors declared in `getWinners()`
- [x] 8.11 Test single survivor becomes sole winner
- [x] 8.12 Test no survivors → `getWinners()` returns empty array
- [x] 8.13 Test `speedMode: true` sets `questionTimeLimitMs` to 3000
- [x] 8.14 Test `REVEAL_DELAY_MS` equals 2500

## 9. Verify

- [x] 9.1 Run `npm test` — all new tests pass and all existing Bingo tests continue to pass
- [x] 9.2 Run `npm run build` — TypeScript compiles cleanly with no errors
