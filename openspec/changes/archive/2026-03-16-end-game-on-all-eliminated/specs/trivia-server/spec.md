## MODIFIED Requirements

### Requirement: game_over broadcast when game ends
When `TriviaGame.showSurvivors()` transitions to `game_over`, the server SHALL broadcast a `game_over` event to all players. This transition occurs when either no more questions remain OR all players have been eliminated.

#### Scenario: game_over broadcast on final question
- **WHEN** the game transitions to `game_over` because no more questions remain
- **THEN** a `game_over` event SHALL be broadcast to all players containing the `winners` array of screen names

#### Scenario: game_over broadcast when all players eliminated mid-game
- **WHEN** the game transitions to `game_over` because all players were eliminated in a round and questions still remain
- **THEN** a `game_over` event SHALL be broadcast to all players with an empty `winners` array and no `survivors_regrouped` event SHALL be sent
