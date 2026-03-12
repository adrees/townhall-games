## ADDED Requirements

### Requirement: Admin initiates a trivia session via WebSocket
After a valid question list is ready, the admin UI SHALL send a `create_session` command with `gameMode: 'trivia'`, the parsed question array, and an optional `speed` flag. The server SHALL respond with `session_created`.

#### Scenario: Session is created with trivia game mode
- **WHEN** the admin clicks Start Session with a valid question list
- **THEN** the UI sends `{ type: 'create_session', gameMode: 'trivia', questions: [...] }` over WebSocket

#### Scenario: UI transitions to controller panel on session_created
- **WHEN** the server responds with `session_created`
- **THEN** the setup section is hidden and the controller section is shown

#### Scenario: Speed flag is forwarded on session creation
- **WHEN** `?speed=true` is present in the page URL and admin clicks Start Session
- **THEN** the command includes `speed: true`

### Requirement: Controller displays a question queue with current question highlighted
The controller section SHALL render all session questions as an ordered list. The currently-previewed question SHALL be visually highlighted.

#### Scenario: Question queue is rendered after session creation
- **WHEN** the session is created with N questions
- **THEN** all N questions are listed in the controller panel

#### Scenario: Current question is highlighted
- **WHEN** the admin previews a question
- **THEN** that question is visually distinguished from others in the queue

### Requirement: Admin controls question lifecycle via Preview, Go Live, and Advance buttons
The controller SHALL expose three action buttons that send the corresponding WebSocket commands. Each button SHALL only be enabled when its action is valid for the current state.

#### Scenario: Preview button sends start_trivia_question
- **WHEN** the admin clicks Preview for question index i
- **THEN** the UI sends `{ type: 'start_trivia_question', questionIndex: i }`

#### Scenario: Go Live button sends go_live
- **WHEN** the admin clicks Go Live after a preview
- **THEN** the UI sends `{ type: 'go_live' }`

#### Scenario: Advance button sends advance_question
- **WHEN** the admin clicks Advance after a question result is received
- **THEN** the UI sends `{ type: 'advance_question' }`

#### Scenario: Go Live is disabled before a question is previewed
- **WHEN** no question has been previewed yet
- **THEN** the Go Live button is disabled

#### Scenario: Advance is disabled until question_result is received
- **WHEN** the question is live but `question_result` has not been received
- **THEN** the Advance button is disabled

### Requirement: Live answer stats panel shows real-time counts
The admin UI SHALL update a stats panel with per-answer counts (A/B/C/D), total answered, and remaining players each time a `live_answer_stats` event is received.

#### Scenario: Live stats update on each live_answer_stats event
- **WHEN** the server sends `live_answer_stats`
- **THEN** the stats panel shows the updated counts, answered total, and remaining count

### Requirement: Question result panel shows outcome after each question
On receiving `question_result`, the admin UI SHALL display the correct answer, the list of eliminated players, and the survivor count.

#### Scenario: Result panel shows correct answer and eliminated players
- **WHEN** the server sends `question_result`
- **THEN** the admin sees the correct answer letter, names of eliminated players, and survivor count

### Requirement: Server extends CreateSessionCommand to support trivia
The server `parseCommand` function SHALL accept `create_session` commands with `gameMode: 'trivia'`, a `questions` array of `TriviaQuestion` objects, and an optional `speed: boolean`. On receipt, the server SHALL create a `TriviaGame` with the supplied questions and speed option and a `Session` with `gameMode: 'trivia'`.

#### Scenario: Trivia session is created from create_session command
- **WHEN** the server receives `{ type: 'create_session', gameMode: 'trivia', questions: [...] }`
- **THEN** the server creates a TriviaGame and Session and responds with `session_created`

#### Scenario: Speed mode is applied when speed flag is set
- **WHEN** the server receives `create_session` with `speed: true`
- **THEN** the TriviaGame is constructed with `speedMode: true` (3-second timer)

#### Scenario: Bingo create_session requires gameMode bingo
- **WHEN** the server receives `{ type: 'create_session', gameMode: 'bingo', words: [...] }`
- **THEN** the server creates a bingo Session as before and responds with `session_created`
