## MODIFIED Requirements

### Requirement: Server handlers can branch on `gameMode`
The `gameMode` field SHALL be accessible from the WebSocket handler context so that incoming messages can be dispatched to mode-specific logic. Handlers MUST implement full trivia dispatch paths — not stubs — routing trivia commands to `TriviaGame` and bingo commands to `BingoGame`. Sending a command intended for the wrong game mode SHALL return an `error` event to the caller.

#### Scenario: Handler reads gameMode from session
- **WHEN** a WebSocket handler holds a reference to a `Session` instance
- **THEN** `session.gameMode` is accessible and returns the correct mode string

#### Scenario: Unknown game mode is rejected at construction
- **WHEN** a `Session` is constructed with an invalid `gameMode` value
- **THEN** TypeScript rejects the call at compile time due to the union type constraint

#### Scenario: Trivia command on bingo session returns error
- **WHEN** a client sends a trivia-specific command (e.g., `go_live`) to a session with `gameMode: 'bingo'`
- **THEN** an `error` event SHALL be returned and the bingo session state SHALL be unchanged

#### Scenario: Bingo command on trivia session returns error
- **WHEN** a client sends a bingo-specific command (e.g., `mark_word`) to a session with `gameMode: 'trivia'`
- **THEN** an `error` event SHALL be returned and the trivia session state SHALL be unchanged
