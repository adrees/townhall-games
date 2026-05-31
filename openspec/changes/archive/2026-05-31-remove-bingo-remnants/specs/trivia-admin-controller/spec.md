## MODIFIED Requirements

### Requirement: Admin initiates a trivia session via WebSocket
After a valid question list is ready, the admin UI SHALL send a `create_session` command with the parsed question array and an optional `speed` flag. The command SHALL NOT include a `gameMode` field. The server SHALL respond with `session_created`.

#### Scenario: Session is created without gameMode field
- **WHEN** the admin clicks Start Session with a valid question list
- **THEN** the UI sends `{ type: 'create_session', questions: [...] }` over WebSocket (no `gameMode` field)

#### Scenario: UI transitions to controller panel on session_created
- **WHEN** the server responds with `session_created`
- **THEN** the setup section is hidden and the controller section is shown

#### Scenario: Speed flag is forwarded on session creation
- **WHEN** `?speed=true` is present in the page URL and admin clicks Start Session
- **THEN** the command includes `speed: true`

### Requirement: Server extends CreateSessionCommand to support trivia
The server `parseCommand` function SHALL accept `create_session` commands with a `questions` array of `TriviaQuestion` objects and an optional `speed: boolean`. The command SHALL NOT require or accept a `gameMode` field. On receipt, the server SHALL create a `TriviaGame` with the supplied questions and speed option and a `Session`.

#### Scenario: Trivia session is created from create_session command
- **WHEN** the server receives `{ type: 'create_session', questions: [...] }`
- **THEN** the server creates a TriviaGame and Session and responds with `session_created`

#### Scenario: Speed mode is applied when speed flag is set
- **WHEN** the server receives `create_session` with `speed: true`
- **THEN** the TriviaGame is constructed with `speedMode: true` (3-second timer)
