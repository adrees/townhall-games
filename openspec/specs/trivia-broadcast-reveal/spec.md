## ADDED Requirements

### Requirement: Broadcast screen highlights the correct answer and animates eliminated players out
When an `answer_revealed` event is received, the broadcast screen SHALL highlight the correct answer bar and animate eliminated player names off the display. Surviving player names SHALL remain visible.

#### Scenario: Correct answer bar is highlighted on answer_revealed
- **WHEN** the broadcast screen receives an `answer_revealed` event with `correct: "B"`
- **THEN** the bar for option B is visually highlighted (e.g., turns green) to indicate the correct answer

#### Scenario: Eliminated player names animate off screen
- **WHEN** an `answer_revealed` event lists eliminated player IDs
- **THEN** the corresponding name elements animate off the display (e.g., drop down with fade)

#### Scenario: Surviving player names remain visible
- **WHEN** an `answer_revealed` event is received
- **THEN** names not in the `eliminated` list remain visible in the word cloud

#### Scenario: Eliminated names are removed from DOM after animation
- **WHEN** the elimination animation completes
- **THEN** eliminated name elements are removed from the DOM
