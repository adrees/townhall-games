## ADDED Requirements

### Requirement: Admin-to-server trivia commands are parseable
The protocol SHALL define and parse three admin commands specific to Trivia: `start_trivia_question`, `go_live`, and `advance_question`. `parseCommand` MUST return a typed command object for each when the JSON is valid, and return `null` for malformed payloads.

#### Scenario: start_trivia_question parsed correctly
- **WHEN** `parseCommand` receives `{"type":"start_trivia_question","questionIndex":0}`
- **THEN** it SHALL return `{ type: 'start_trivia_question', questionIndex: 0 }`

#### Scenario: start_trivia_question with missing questionIndex returns null
- **WHEN** `parseCommand` receives `{"type":"start_trivia_question"}`
- **THEN** it SHALL return `null`

#### Scenario: start_trivia_question with non-numeric questionIndex returns null
- **WHEN** `parseCommand` receives `{"type":"start_trivia_question","questionIndex":"zero"}`
- **THEN** it SHALL return `null`

#### Scenario: go_live parsed correctly
- **WHEN** `parseCommand` receives `{"type":"go_live"}`
- **THEN** it SHALL return `{ type: 'go_live' }`

#### Scenario: advance_question parsed correctly
- **WHEN** `parseCommand` receives `{"type":"advance_question"}`
- **THEN** it SHALL return `{ type: 'advance_question' }`

### Requirement: Player submit_answer command is parseable
The protocol SHALL define and parse a `submit_answer` player command carrying an `AnswerOption` payload (`'A'|'B'|'C'|'D'`).

#### Scenario: submit_answer with valid option parsed correctly
- **WHEN** `parseCommand` receives `{"type":"submit_answer","answer":"B"}`
- **THEN** it SHALL return `{ type: 'submit_answer', answer: 'B' }`

#### Scenario: submit_answer with invalid answer value returns null
- **WHEN** `parseCommand` receives `{"type":"submit_answer","answer":"E"}`
- **THEN** it SHALL return `null`

#### Scenario: submit_answer with missing answer field returns null
- **WHEN** `parseCommand` receives `{"type":"submit_answer"}`
- **THEN** it SHALL return `null`

### Requirement: Server-to-all-players trivia broadcast events are serialisable
The protocol SHALL define broadcast event types sent to all connected clients during a Trivia game: `question_preview`, `question_live`, `timer_expired`, `answer_breakdown`, `answer_revealed`, `survivors_regrouped`, and `game_over`. Each MUST round-trip through `serializeEvent` as valid JSON containing the correct `type` field and all required payload fields.

#### Scenario: question_preview serialises correctly
- **WHEN** `serializeEvent` is called with a `question_preview` event containing `questionIndex` and `text`
- **THEN** the JSON string SHALL contain `"type":"question_preview"`, `questionIndex`, and `text`

#### Scenario: question_live serialises with options and timeLimit
- **WHEN** `serializeEvent` is called with a `question_live` event
- **THEN** the JSON SHALL contain `"type":"question_live"`, `text`, `options` array of four strings, and `timeLimit`

#### Scenario: timer_expired serialises correctly
- **WHEN** `serializeEvent` is called with `{ type: 'timer_expired' }`
- **THEN** the JSON SHALL contain `"type":"timer_expired"`

#### Scenario: answer_breakdown serialises with counts
- **WHEN** `serializeEvent` is called with an `answer_breakdown` event
- **THEN** the JSON SHALL contain `"type":"answer_breakdown"`, `counts` object with A/B/C/D keys, `totalAnswered`, and `totalPlayers`

#### Scenario: answer_revealed serialises with correct and eliminated
- **WHEN** `serializeEvent` is called with an `answer_revealed` event
- **THEN** the JSON SHALL contain `"type":"answer_revealed"`, `correct` (an AnswerOption), `eliminated` array, and `survivors` array

#### Scenario: survivors_regrouped serialises with count and names
- **WHEN** `serializeEvent` is called with a `survivors_regrouped` event
- **THEN** the JSON SHALL contain `"type":"survivors_regrouped"`, `survivorCount`, and `survivorNames` array

#### Scenario: game_over serialises with winners
- **WHEN** `serializeEvent` is called with a `game_over` event
- **THEN** the JSON SHALL contain `"type":"game_over"` and `winners` array of screen names

### Requirement: Server-to-individual-player trivia events are serialisable
The protocol SHALL define three per-player events: `you_are_eliminated`, `you_survived`, and `answer_accepted`. Each MUST serialise to JSON with the correct `type` and required payload.

#### Scenario: you_are_eliminated serialises with correctAnswer and yourAnswer
- **WHEN** `serializeEvent` is called with a `you_are_eliminated` event
- **THEN** the JSON SHALL contain `"type":"you_are_eliminated"`, `correctAnswer`, and `yourAnswer`

#### Scenario: you_survived serialises with survivorCount
- **WHEN** `serializeEvent` is called with a `you_survived` event
- **THEN** the JSON SHALL contain `"type":"you_survived"` and `survivorCount`

#### Scenario: answer_accepted serialises correctly
- **WHEN** `serializeEvent` is called with `{ type: 'answer_accepted' }`
- **THEN** the JSON SHALL contain `"type":"answer_accepted"`

### Requirement: Server-to-admin trivia stats events are serialisable
The protocol SHALL define `live_answer_stats` and `question_result` events sent exclusively to the admin connection.

#### Scenario: live_answer_stats serialises with streaming counts
- **WHEN** `serializeEvent` is called with a `live_answer_stats` event
- **THEN** the JSON SHALL contain `"type":"live_answer_stats"`, `counts` (A/B/C/D), `answered`, and `remaining`

#### Scenario: question_result serialises with correct and survivor lists
- **WHEN** `serializeEvent` is called with a `question_result` event
- **THEN** the JSON SHALL contain `"type":"question_result"`, `correct`, `eliminated` array, and `survivors` array
