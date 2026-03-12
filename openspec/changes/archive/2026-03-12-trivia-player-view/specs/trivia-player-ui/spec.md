## ADDED Requirements

### Requirement: Player sees A/B/C/D answer buttons during question_live
When the server broadcasts `question_live`, the player view SHALL display the question text and four labelled answer buttons (A, B, C, D) with their option text. The countdown timer SHALL start from `timeLimit` seconds and decrement once per second.

#### Scenario: question_live renders question and buttons
- **WHEN** the client receives a `question_live` event with `text`, `options`, and `timeLimit`
- **THEN** the question text SHALL be displayed, four answer buttons SHALL appear labelled A/B/C/D with corresponding option text, and a countdown timer SHALL start at `timeLimit`

#### Scenario: Countdown decrements every second
- **WHEN** the question is live and the countdown timer is running
- **THEN** the displayed countdown SHALL decrease by 1 each second until it reaches 0 or `timer_expired` is received

#### Scenario: Countdown freezes on timer_expired
- **WHEN** the client receives `timer_expired`
- **THEN** the countdown display SHALL freeze (stop decrementing) and the answer buttons SHALL be disabled

### Requirement: Submitting an answer locks the UI and sends submit_answer
After a player taps an answer button, the choice SHALL be locked — no further answer changes are allowed — and a `submit_answer` command SHALL be sent to the server. The selected button SHALL be visually highlighted.

#### Scenario: Tapping an answer button sends submit_answer
- **WHEN** a player taps answer button B during `question_live`
- **THEN** `{ type: 'submit_answer', answer: 'B' }` SHALL be sent to the server

#### Scenario: Answer buttons are disabled after selection
- **WHEN** a player has submitted an answer
- **THEN** all four answer buttons SHALL be disabled and the chosen button SHALL be visually marked as selected

#### Scenario: answer_accepted confirms receipt
- **WHEN** the client receives `answer_accepted`
- **THEN** a visual confirmation (e.g., "Answer received!") SHALL be shown to the player

### Requirement: answer_breakdown phase shows waiting screen
During the 2.5s breakdown phase the player has no action. The player view SHALL show a neutral waiting message.

#### Scenario: answer_breakdown shows waiting state
- **WHEN** the client receives `answer_breakdown`
- **THEN** the answer buttons SHALL be hidden and a "Waiting for results..." message SHALL be displayed

### Requirement: Surviving player sees you_survived screen
When `you_survived` is received the player SHALL see a positive outcome screen showing the current survivor count.

#### Scenario: you_survived displays survivor screen
- **WHEN** the client receives `you_survived` with `survivorCount`
- **THEN** the player view SHALL display a "You're through!" message and show the survivor count

### Requirement: Eliminated player sees you_are_eliminated screen and enters spectator mode
When `you_are_eliminated` is received the player SHALL see an elimination screen showing the correct answer and their submitted answer (or null for no answer). After this, the player is in spectator mode — they receive subsequent broadcast events but have no interactive controls.

#### Scenario: you_are_eliminated displays elimination screen
- **WHEN** the client receives `you_are_eliminated` with `correctAnswer` and `yourAnswer`
- **THEN** the player view SHALL display "You're out!", the correct answer, and the player's answer (or "No answer" if null)

#### Scenario: Eliminated player receives subsequent broadcast events
- **WHEN** an eliminated player receives `survivors_regrouped` or `game_over`
- **THEN** the spectator view SHALL update to reflect the new state (survivor count or winner names) without showing any interactive controls

### Requirement: game_over displays winner names to all players
When `game_over` is received every connected player (survivors and spectators) SHALL see the winner names.

#### Scenario: game_over shown to surviving player
- **WHEN** a surviving player receives `game_over` with `winners`
- **THEN** the player view SHALL display the winner names

#### Scenario: game_over shown to eliminated spectator
- **WHEN** an eliminated player in spectator mode receives `game_over`
- **THEN** the spectator view SHALL update to display the winner names

### Requirement: Trivia UI activates reactively on first trivia event
The player view does not switch to Trivia mode at join time. Instead, the first trivia-specific event received after `joined` SHALL trigger the UI switch from the neutral waiting screen to the Trivia player layout.

#### Scenario: question_preview triggers trivia UI switch
- **WHEN** a joined player receives `question_preview` while in the neutral waiting state
- **THEN** the view SHALL switch to Trivia mode and display a "Get ready..." holding screen

#### Scenario: question_live triggers trivia UI switch if question_preview was missed
- **WHEN** a joined player receives `question_live` while still in the neutral waiting state
- **THEN** the view SHALL switch to Trivia mode and immediately render the question and answer buttons
