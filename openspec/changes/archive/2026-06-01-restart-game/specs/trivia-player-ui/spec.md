## ADDED Requirements

### Requirement: Player sees a rejoin affordance after game_reset
When the client receives `game_reset`, the player view SHALL display a "Waiting for next game..." message and a disabled "Rejoin Game" button. The button SHALL become enabled when a subsequent `session_created` event is received.

#### Scenario: game_reset shows waiting message and disabled rejoin button
- **WHEN** the client receives `game_reset`
- **THEN** the player view SHALL show a "Waiting for next game..." message and a disabled "Rejoin Game" button, regardless of what screen the player is currently on

#### Scenario: session_created enables the rejoin button
- **WHEN** the client receives `session_created` after a prior `game_reset`
- **THEN** the "Rejoin Game" button SHALL become enabled

### Requirement: Rejoin button navigates to /play with name pre-filled
When the player clicks the enabled "Rejoin Game" button, the browser SHALL navigate to `/play?name=<screenName>` where `<screenName>` is the player's screen name from the current session. The `?name=` param triggers the existing auto-join mechanism on load.

#### Scenario: Rejoin button navigates with correct name param
- **WHEN** the player clicks the enabled Rejoin Game button
- **THEN** the browser SHALL navigate to `/play?name=<playerScreenName>` (URL-encoded)

#### Scenario: Player is rejoined automatically on load
- **WHEN** the player page loads with `?name=Alice` and a session is active
- **THEN** the `join` command SHALL be sent automatically and the player SHALL land on the waiting screen
