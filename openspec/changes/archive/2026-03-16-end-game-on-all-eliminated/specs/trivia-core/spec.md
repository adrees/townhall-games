## MODIFIED Requirements

### Requirement: TriviaGame state machine
`TriviaGame` SHALL implement a six-phase state machine with the following valid states: `waiting`, `question_preview`, `question_live`, `breakdown`, `answer_revealed`, `survivors`, `game_over`. It MUST enforce valid transitions and reject actions that are illegal in the current state.

#### Scenario: Initial state is waiting
- **WHEN** a new `TriviaGame` is constructed
- **THEN** its `state` SHALL be `waiting`

#### Scenario: Preview a question from waiting
- **WHEN** `previewQuestion(index)` is called in `waiting` state with a valid question index
- **THEN** `state` SHALL become `question_preview` and the current question index SHALL be set

#### Scenario: Preview a question from survivors
- **WHEN** `previewQuestion(index)` is called in `survivors` state
- **THEN** `state` SHALL become `question_preview`

#### Scenario: Go live from preview
- **WHEN** `goLive()` is called in `question_preview` state
- **THEN** `state` SHALL become `question_live`

#### Scenario: Transition to breakdown at timer expiry
- **WHEN** `expireTimer()` is called in `question_live` state
- **THEN** `state` SHALL become `breakdown`

#### Scenario: Transition to answer_revealed from breakdown
- **WHEN** `revealAnswer()` is called in `breakdown` state
- **THEN** `state` SHALL become `answer_revealed`

#### Scenario: Transition to survivors from answer_revealed
- **WHEN** `showSurvivors()` is called in `answer_revealed` state and at least one survivor remains and more questions remain
- **THEN** `state` SHALL become `survivors`

#### Scenario: Transition to game_over when no questions remain
- **WHEN** `showSurvivors()` is called in `answer_revealed` state and there are no more questions
- **THEN** `state` SHALL become `game_over`

#### Scenario: Transition to game_over when all players are eliminated
- **WHEN** `showSurvivors()` is called in `answer_revealed` state and the survivor count is zero
- **THEN** `state` SHALL become `game_over` regardless of whether more questions remain

#### Scenario: Illegal transition is rejected
- **WHEN** a state-advancing method is called in an incompatible state (e.g., `goLive()` in `waiting`)
- **THEN** the call SHALL throw an error and the state SHALL remain unchanged
