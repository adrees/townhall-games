## ADDED Requirements

### Requirement: Broadcast screen displays the live question with answer labels and an animated countdown
When a `question_live` event is received, the broadcast screen SHALL switch to the question phase and display the full question text, A/B/C/D answer option labels (not values — players see full text on their phones), and an animated countdown ring that drains from full to empty over the `timeLimit` seconds.

#### Scenario: Question phase activates on question_live
- **WHEN** the broadcast screen receives a `question_live` event
- **THEN** the question section becomes visible and the lobby/other sections are hidden

#### Scenario: Question text is displayed
- **WHEN** a `question_live` event is received with a `text` field
- **THEN** the broadcast screen shows the question text prominently

#### Scenario: Answer option labels are displayed without values
- **WHEN** a `question_live` event is received
- **THEN** the broadcast screen shows labels A, B, C, D (letter only — option text is not shown on broadcast)

#### Scenario: Countdown ring starts full and drains over timeLimit seconds
- **WHEN** a `question_live` event is received with `timeLimit: 10`
- **THEN** an animated ring begins full and drains to empty over 10 seconds

#### Scenario: Countdown ring freezes at zero on timer_expired
- **WHEN** a `timer_expired` event is received
- **THEN** the countdown ring stops at zero and the broadcast transitions to the breakdown phase
