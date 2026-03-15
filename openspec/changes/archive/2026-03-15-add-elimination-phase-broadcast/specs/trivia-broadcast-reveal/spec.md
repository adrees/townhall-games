## MODIFIED Requirements

### Requirement: Broadcast screen highlights the correct answer and triggers the elimination phase
When an `answer_revealed` event is received, the broadcast screen SHALL highlight the correct answer bar and transition to the `elimination` phase where eliminated player names animate off the word cloud. Surviving player names SHALL remain visible.

#### Scenario: Correct answer bar is highlighted on answer_revealed
- **WHEN** the broadcast screen receives an `answer_revealed` event with `correct: "B"`
- **THEN** the bar for option B is visually highlighted (e.g., turns green) to indicate the correct answer

#### Scenario: Eliminated player names animate off screen in the elimination phase
- **WHEN** an `answer_revealed` event lists eliminated player IDs
- **THEN** the broadcast transitions to the `elimination` phase and the corresponding name elements animate off the display (drop down with fade) within the visible word cloud

#### Scenario: Surviving player names remain visible
- **WHEN** an `answer_revealed` event is received
- **THEN** names not in the `eliminated` list remain visible in the word cloud during the elimination phase

#### Scenario: Eliminated names are removed from playerSpans after animation window
- **WHEN** the 2-second elimination animation window completes
- **THEN** eliminated player IDs are removed from the internal `playerSpans` map so they do not reappear in the survivor cloud
