## MODIFIED Requirements

### Requirement: create_session establishes a trivia session
The `create_session` command SHALL no longer carry a `gameMode` discriminant. The server SHALL treat every `create_session` as a trivia session. The command payload SHALL be `{ type: 'create_session', questions: TriviaQuestion[], speed?: boolean }`.

#### Scenario: create_session with questions creates a session
- **WHEN** a WebSocket connection sends `create_session` with a valid questions array
- **THEN** a trivia session is created and `session_created` is returned to the sender, who becomes the admin socket

#### Scenario: create_session with speed:true uses 3-second timer
- **WHEN** `create_session` is sent with `speed: true`
- **THEN** the session's question timer is set to 3000ms instead of 10000ms

## REMOVED Requirements

### Requirement: Bingo sessions are unaffected by trivia routing
Removed — bingo mode no longer exists. The gameMode branching in ws-handler is eliminated entirely.

### Requirement: Trivia session ignores bingo commands
Removed — bingo-specific commands (`mark_word`, `start_game`, `start_new_round`) are no longer part of the protocol. Any unrecognised command type SHALL return an error to the sender.
