## MODIFIED Requirements

### Requirement: Broadcast screen shows answer distribution bars during the breakdown phase
When an `answer_breakdown` event is received, the broadcast screen SHALL display the current question text above four proportional bars (A, B, C, D) showing how many players chose each option. The correct answer SHALL NOT be revealed during this phase. The bars SHALL animate to their target width.

#### Scenario: Breakdown phase activates on answer_breakdown
- **WHEN** the broadcast screen receives an `answer_breakdown` event
- **THEN** the breakdown section becomes visible and the question section is hidden

#### Scenario: Question text is shown above the answer bars
- **WHEN** the breakdown section becomes visible
- **THEN** the question text from the most recent `question_live` event SHALL be displayed above the answer distribution bars

#### Scenario: Question text persists from question_live through breakdown
- **WHEN** the timer expires and the phase transitions from `question` to `breakdown`
- **THEN** the question text that was shown during the live question phase SHALL remain visible in the breakdown section without re-fetching from the server

#### Scenario: Four bars show per-option counts
- **WHEN** an `answer_breakdown` event is received with counts `{A: 3, B: 12, C: 2, D: 1}`
- **THEN** the broadcast shows four bars with widths proportional to those counts, labelled A, B, C, D

#### Scenario: Bars animate to their target width
- **WHEN** the breakdown bars are rendered
- **THEN** each bar visually grows from zero to its target width with a smooth transition

#### Scenario: Correct answer is not highlighted during breakdown
- **WHEN** the breakdown bars are displayed
- **THEN** no bar is visually distinguished as the correct answer

#### Scenario: Raw counts are shown on each bar
- **WHEN** the breakdown bars are displayed
- **THEN** each bar shows the numeric count of players who chose that option
