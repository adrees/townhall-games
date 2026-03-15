## ADDED Requirements

### Requirement: Broadcast screen shows an elimination phase after answer_revealed
When an `answer_revealed` event is received, the broadcast screen SHALL transition to an `elimination` phase that displays the word cloud with eliminated names animating off screen, before transitioning to the survivor phase. The elimination phase SHALL always be shown regardless of how many players were eliminated.

#### Scenario: Elimination phase activates on answer_revealed
- **WHEN** the broadcast screen receives an `answer_revealed` event
- **THEN** the broadcast screen transitions to the `elimination` phase, making the word cloud visible

#### Scenario: Eliminated names animate off screen during elimination phase
- **WHEN** the elimination phase is active
- **THEN** name spans for all player IDs in `msg.eliminated` animate off screen (drop down with fade)

#### Scenario: Surviving names remain visible during elimination phase
- **WHEN** the elimination phase is active
- **THEN** name spans not listed in `msg.eliminated` remain visible in the word cloud

#### Scenario: Elimination phase shown even when no players are eliminated
- **WHEN** an `answer_revealed` event arrives with an empty `eliminated` array
- **THEN** the broadcast still transitions to the elimination phase briefly before moving to survivor

#### Scenario: Elimination phase transitions to survivor after animation completes
- **WHEN** approximately 2 seconds have elapsed since the elimination phase began
- **THEN** the broadcast screen transitions to the survivor phase

### Requirement: survivors_regrouped is buffered during the elimination animation
The broadcast client SHALL buffer the `survivors_regrouped` event if it arrives while the elimination animation is in progress, and process it only after the animation window completes.

#### Scenario: survivors_regrouped buffered during elimination animation
- **WHEN** a `survivors_regrouped` event arrives while the elimination phase is animating
- **THEN** the survivor phase does not immediately activate; it activates after the animation window ends

#### Scenario: survivors_regrouped processed immediately if no animation pending
- **WHEN** a `survivors_regrouped` event arrives and no elimination animation is in progress
- **THEN** the survivor phase activates immediately

### Requirement: Word cloud is a persistent element visible during both lobby and elimination phases
The `#wordCloud` element SHALL be a standalone persistent DOM element, not nested inside any phase section, and SHALL be visible during both the `lobby` and `elimination` phases.

#### Scenario: Word cloud visible during lobby phase
- **WHEN** the broadcast is in the `lobby` phase
- **THEN** `#wordCloud` is visible and player names float within it

#### Scenario: Word cloud visible during elimination phase
- **WHEN** the broadcast is in the `elimination` phase
- **THEN** `#wordCloud` is visible with player names in their last known positions

#### Scenario: Word cloud hidden during all other phases
- **WHEN** the broadcast is in `question`, `breakdown`, `survivor`, or `winner` phase
- **THEN** `#wordCloud` is not visible
