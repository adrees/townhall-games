## ADDED Requirements

### Requirement: Admin can restart the game from the controller section
The controller section SHALL include a "Restart Game" button. When clicked, it SHALL send `{ type: 'restart_game' }` over WebSocket and transition the admin UI back to the setup section (hiding the controller section). All controller state SHALL be reset (question index, button states, stats/result panels).

#### Scenario: Restart button sends restart_game and shows setup section
- **WHEN** the admin clicks the Restart Game button in the controller section
- **THEN** the UI sends `{ type: 'restart_game' }`, hides the controller section, and shows the setup section

#### Scenario: Controller state is reset after restart
- **WHEN** the admin triggers a restart
- **THEN** the current question index resets to -1, all controller buttons return to their initial disabled/enabled state, and the stats and result panels are hidden
