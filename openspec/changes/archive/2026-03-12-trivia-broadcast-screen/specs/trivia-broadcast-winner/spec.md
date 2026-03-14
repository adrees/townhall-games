## ADDED Requirements

### Requirement: Broadcast screen shows a winner reveal when the game ends
When a `game_over` event is received, the broadcast screen SHALL transition to the winner phase and display the winner name(s) scaled to fill the screen.

#### Scenario: Winner phase activates on game_over
- **WHEN** the broadcast screen receives a `game_over` event
- **THEN** the winner section becomes visible and all other sections are hidden

#### Scenario: Winner names are displayed large
- **WHEN** a `game_over` event is received with `winners: ["Alice"]`
- **THEN** "Alice" is displayed in large text that fills a significant portion of the screen

#### Scenario: Multiple winners are all displayed
- **WHEN** a `game_over` event is received with `winners: ["Alice", "Bob"]`
- **THEN** both "Alice" and "Bob" are displayed in the winner section

#### Scenario: Winner names animate in
- **WHEN** the winner phase activates
- **THEN** the winner name(s) animate into view (e.g., scale up from small to full size)

#### Scenario: No survivors case is handled gracefully
- **WHEN** a `game_over` event is received with an empty `winners` array
- **THEN** the broadcast screen shows a "No survivors" message instead of winner names
