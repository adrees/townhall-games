### Requirement: TriviaGame state machine
`TriviaGame` SHALL implement a six-phase state machine with the following valid states: `waiting`, `question_preview`, `question_live`, `breakdown`, `answer_revealed`, `survivors`, `game_over`. It MUST enforce valid transitions and reject actions that are illegal in the current state.

#### Scenario: Initial state is waiting
- **WHEN** a new `TriviaGame` is constructed
- **THEN** its `state` SHALL be `waiting`

#### Scenario: Preview a question from waiting
- **WHEN** `previewQuestion(index)` is called in `waiting` state with a valid question index
- **THEN** `state` SHALL become `question_preview` and the current question index SHALL be set

#### Scenario: Preview a question from survivors
- **WHEN** `previewQuestion(index)` is called in `survivors` state
- **THEN** `state` SHALL become `question_preview`

#### Scenario: Go live from preview
- **WHEN** `goLive()` is called in `question_preview` state
- **THEN** `state` SHALL become `question_live`

#### Scenario: Transition to breakdown at timer expiry
- **WHEN** `expireTimer()` is called in `question_live` state
- **THEN** `state` SHALL become `breakdown`

#### Scenario: Transition to answer_revealed from breakdown
- **WHEN** `revealAnswer()` is called in `breakdown` state
- **THEN** `state` SHALL become `answer_revealed`

#### Scenario: Transition to survivors from answer_revealed
- **WHEN** `showSurvivors()` is called in `answer_revealed` state
- **THEN** `state` SHALL become `survivors`

#### Scenario: Transition to game_over when no questions remain
- **WHEN** `showSurvivors()` is called in `answer_revealed` state and there are no more questions
- **THEN** `state` SHALL become `game_over`

#### Scenario: Illegal transition is rejected
- **WHEN** a state-advancing method is called in an incompatible state (e.g., `goLive()` in `waiting`)
- **THEN** the call SHALL throw an error and the state SHALL remain unchanged

### Requirement: TriviaRound answer collection
`TriviaRound` SHALL represent a single question within a game. It MUST accept player answers, track which players answered, and resolve correct/incorrect outcomes after the round closes.

#### Scenario: Accept a valid answer
- **WHEN** `submitAnswer(playerId, 'A')` is called while the round is open
- **THEN** the answer SHALL be recorded for that player

#### Scenario: Reject a second answer from the same player
- **WHEN** `submitAnswer(playerId, 'B')` is called after that player already answered
- **THEN** the submission SHALL be ignored and the original answer SHALL be retained

#### Scenario: Reject answers after round closes
- **WHEN** `close()` has been called on the round
- **THEN** any subsequent `submitAnswer` call SHALL be ignored

#### Scenario: Eliminate players with wrong answer on resolve
- **WHEN** `resolve(correctAnswer)` is called after `close()`
- **THEN** all players whose answer does not match `correctAnswer` SHALL be in the eliminated set

#### Scenario: Eliminate players who did not answer
- **WHEN** `resolve(correctAnswer)` is called and a player in the registered roster submitted no answer
- **THEN** that player SHALL be in the eliminated set

#### Scenario: Survivors are players with correct answer
- **WHEN** `resolve(correctAnswer)` is called
- **THEN** `survivors` SHALL contain exactly the players who submitted the correct answer

#### Scenario: Answer counts are correct
- **WHEN** `getAnswerCounts()` is called after `close()`
- **THEN** it SHALL return counts for each option A/B/C/D reflecting submitted answers

### Requirement: Multiple winners
`TriviaGame` SHALL support multiple simultaneous winners. Any players surviving after the final question SHALL all be declared winners.

#### Scenario: Multiple survivors after final question
- **WHEN** more than one player survives the last question
- **THEN** `getWinners()` SHALL return all of them

#### Scenario: Single survivor
- **WHEN** exactly one player survives the last question
- **THEN** `getWinners()` SHALL return that one player

#### Scenario: No survivors
- **WHEN** all players are eliminated in the last question
- **THEN** `getWinners()` SHALL return an empty array

### Requirement: CsvParser validation and parsing
`CsvParser` SHALL validate and parse a CSV string into an array of `TriviaQuestion` objects. The entire file MUST be validated before any question is returned. If any error is found the parser MUST reject the file with a structured error summary.

#### Scenario: Valid CSV is accepted
- **WHEN** a CSV string has the correct header and 3–15 valid rows
- **THEN** `parse(csv)` SHALL return an array of `TriviaQuestion` objects matching the rows

#### Scenario: Missing or wrong header is rejected
- **WHEN** the header row does not contain exactly `question,a,b,c,d,correct` (case-insensitive)
- **THEN** parsing SHALL fail with an error identifying the header problem

#### Scenario: Row with missing column is rejected
- **WHEN** any data row has fewer than 6 populated columns
- **THEN** parsing SHALL fail and the error SHALL identify the offending row number

#### Scenario: Invalid correct-answer value is rejected
- **WHEN** the `correct` column in any row contains a value other than A, B, C, or D (case-insensitive)
- **THEN** parsing SHALL fail and the error SHALL identify the offending row number

#### Scenario: Too few questions is rejected
- **WHEN** the CSV contains fewer than 3 data rows
- **THEN** parsing SHALL fail with an error stating the minimum requirement

#### Scenario: Too many questions is rejected
- **WHEN** the CSV contains more than 15 data rows
- **THEN** parsing SHALL fail with an error stating the maximum limit

#### Scenario: Duplicate question text is rejected
- **WHEN** two or more rows contain identical question text
- **THEN** parsing SHALL fail and the error SHALL identify the duplicate rows

#### Scenario: All errors are collected before rejection
- **WHEN** a CSV contains multiple validation errors
- **THEN** `parse(csv)` SHALL report all errors together rather than stopping at the first

#### Scenario: Correct answer is normalised to uppercase
- **WHEN** the `correct` column contains a lowercase letter (e.g., `a`)
- **THEN** the parsed `TriviaQuestion.correct` SHALL be the uppercase equivalent (`A`)

### Requirement: Auto-sequencing timer
The game core SHALL expose a mechanism for server-side auto-sequencing. Specifically, it MUST track that `question_live → breakdown` fires at timer expiry (t=0) and `breakdown → answer_revealed` fires after a fixed 2.5-second delay.

#### Scenario: Timer expiry recorded
- **WHEN** `expireTimer()` is called on `TriviaGame`
- **THEN** the game SHALL transition to `breakdown` and record a `breakdownAt` timestamp

#### Scenario: Reveal delay is exactly 2500ms
- **WHEN** the game transitions to `breakdown`
- **THEN** `TriviaGame.REVEAL_DELAY_MS` SHALL equal `2500`

#### Scenario: Speed mode reduces timer
- **WHEN** `TriviaGame` is constructed with `{ speedMode: true }`
- **THEN** `TriviaGame.questionTimeLimitMs` SHALL equal `3000` instead of `10000`
