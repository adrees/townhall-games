## ADDED Requirements

### Requirement: Broadcast screen shows an animated word cloud lobby while waiting for the game to start
The broadcast screen SHALL display a word cloud of player names during the lobby phase. Each name SHALL animate into the display from a random edge position when the corresponding `player_joined` event is received. Names SHALL remain visible until the first question goes live.

#### Scenario: Broadcast screen starts in lobby phase
- **WHEN** the broadcast page loads
- **THEN** the lobby section is visible and all other phase sections are hidden

#### Scenario: Player name appears when player_joined is received
- **WHEN** the broadcast screen receives a `player_joined` event
- **THEN** the player's screen name appears in the word cloud

#### Scenario: Name animates in from a random edge
- **WHEN** a player name is added to the word cloud
- **THEN** the name begins off-screen and transitions to a position within the word cloud container

#### Scenario: All names remain visible during lobby
- **WHEN** multiple players have joined
- **THEN** all joined player names are simultaneously visible in the word cloud

#### Scenario: Lobby clears when first question goes live
- **WHEN** a `question_live` event is received
- **THEN** the broadcast screen transitions away from the lobby phase
