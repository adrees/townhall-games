## Requirements

### Requirement: Admin page does not show a game-mode navigation button
The trivia admin page SHALL NOT display a "Game Mode Selector" button or any link back to `/admin`, as there is only one game mode.

#### Scenario: No game mode selector button rendered
- **WHEN** an admin loads `/admin/trivia`
- **THEN** no "Game Mode Selector" button or link to `/admin` SHALL be present in the page

### Requirement: Admin panel text is readable against its background
All text in the live-answer-stats panel, the question-result panel, and the selected-question highlight SHALL have sufficient contrast against their respective background colours.

#### Scenario: Stats panel text is dark on light background
- **WHEN** the stats panel (`#statsPanel`) is visible
- **THEN** all text inside it SHALL be rendered in a dark colour with a contrast ratio ≥ 4.5:1 against the panel's light background

#### Scenario: Result panel text is dark on light background
- **WHEN** the result panel (`#resultPanel`) is visible
- **THEN** all text inside it SHALL be rendered in a dark colour with a contrast ratio ≥ 4.5:1 against the panel's light background

#### Scenario: Selected question text is dark on highlighted background
- **WHEN** a question is marked as current in the question queue (`.question-queue li.current`)
- **THEN** its text SHALL be rendered in a dark colour with a contrast ratio ≥ 4.5:1 against the highlight background
