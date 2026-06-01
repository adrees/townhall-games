## ADDED Requirements

### Requirement: restart_game command tears down the active session
The server SHALL accept a `{ type: 'restart_game' }` command from the admin connection. On receipt it SHALL cancel any running question timer, broadcast a `game_reset` event to all connected player and spectator sockets, then clear all session and game state (session, triviaGame, player maps). The admin connection SHALL remain open.

#### Scenario: restart_game broadcasts game_reset to all clients
- **WHEN** the admin sends `{ type: 'restart_game' }`
- **THEN** the server SHALL broadcast `{ type: 'game_reset' }` to all connected player sockets and spectator sockets before clearing state

#### Scenario: restart_game cancels any running timer
- **WHEN** the admin sends `restart_game` while a question timer is active
- **THEN** the server SHALL cancel the timer so that `timer_expired` and `answer_revealed` do NOT fire after the restart

#### Scenario: restart_game with no active session is a no-op
- **WHEN** the admin sends `restart_game` and no session is active
- **THEN** the server SHALL do nothing (no error, no broadcast)

#### Scenario: create_session succeeds after restart_game
- **WHEN** the admin sends `restart_game` followed by `create_session`
- **THEN** a new session SHALL be created normally and `session_created` SHALL be broadcast to all connected clients

### Requirement: session_created is broadcast to all connected clients
When a new session is created, the server SHALL broadcast `session_created` to all connected player and spectator sockets in addition to sending it to the admin socket.

#### Scenario: session_created reaches connected player sockets
- **WHEN** the server creates a new session via `create_session`
- **THEN** all currently-connected player sockets SHALL receive the `session_created` event
