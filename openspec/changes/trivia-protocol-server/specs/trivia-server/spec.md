## ADDED Requirements

### Requirement: Admin trivia commands are routed to TriviaGame
When a session has `gameMode: 'trivia'`, the admin handler SHALL route `start_trivia_question`, `go_live`, and `advance_question` to the corresponding `TriviaGame` methods and broadcast the resulting state change to all connected clients.

#### Scenario: start_trivia_question transitions game to question_preview and broadcasts
- **WHEN** the admin sends `start_trivia_question` with a valid `questionIndex`
- **THEN** `TriviaGame.previewQuestion(questionIndex)` SHALL be called and a `question_preview` event SHALL be broadcast to all players

#### Scenario: start_trivia_question with invalid index returns error to admin
- **WHEN** the admin sends `start_trivia_question` with an out-of-range `questionIndex`
- **THEN** an `error` event SHALL be sent to the admin and the game state SHALL remain unchanged

#### Scenario: go_live transitions game and broadcasts question_live
- **WHEN** the admin sends `go_live` and the game is in `question_preview`
- **THEN** `TriviaGame.goLive()` SHALL be called and a `question_live` event SHALL be broadcast to all players containing the question text, four options, and the time limit

#### Scenario: advance_question transitions game from survivors to next question_preview
- **WHEN** the admin sends `advance_question` and the game is in `survivors`
- **THEN** the server SHALL call `previewQuestion` with the next question index and broadcast `question_preview`

#### Scenario: admin trivia command in wrong game state returns error
- **WHEN** the admin sends a trivia command that is illegal for the current `TriviaGame` state (e.g., `go_live` when state is `waiting`)
- **THEN** an `error` event SHALL be sent to the admin only; all players are unaffected

### Requirement: Player submit_answer is routed and confirmed
When a trivia round is live, the player handler SHALL accept `submit_answer` commands, forward the answer to `TriviaRound.submitAnswer`, and confirm receipt to the individual player.

#### Scenario: Valid answer accepted and confirmed
- **WHEN** a joined player sends `submit_answer` with a valid `AnswerOption` during `question_live`
- **THEN** the answer SHALL be recorded in the current `TriviaRound` and an `answer_accepted` event SHALL be sent to that player only

#### Scenario: Answer submitted outside question_live is silently ignored
- **WHEN** a player sends `submit_answer` when the game is not in `question_live`
- **THEN** no state change SHALL occur and no `answer_accepted` event is sent

#### Scenario: Unjoined player submitting answer receives error
- **WHEN** a WebSocket connection that has not joined sends `submit_answer`
- **THEN** an `error` event SHALL be sent to that connection

### Requirement: Auto-sequencing timer fires after question_live expires
The server SHALL manage the two-phase auto-sequencing. At timer expiry it SHALL call `TriviaGame.expireTimer()` and broadcast `timer_expired`. After `TriviaGame.REVEAL_DELAY_MS` milliseconds it SHALL call `TriviaGame.revealAnswer()` and broadcast the reveal sequence.

#### Scenario: Timer expiry broadcasts timer_expired and starts reveal countdown
- **WHEN** the question timer reaches zero (server fires `expireTimer()`)
- **THEN** a `timer_expired` event SHALL be broadcast to all players and `answer_breakdown` SHALL be broadcast immediately after containing per-option counts and totals

#### Scenario: Reveal fires automatically after REVEAL_DELAY_MS
- **WHEN** `REVEAL_DELAY_MS` milliseconds elapse after `timer_expired`
- **THEN** `TriviaGame.revealAnswer()` SHALL be called, `answer_revealed` SHALL be broadcast to all players, per-player `you_are_eliminated` or `you_survived` events SHALL be sent to each player, and `question_result` SHALL be sent to the admin only

#### Scenario: Survivors are regrouped after reveal animation delay
- **WHEN** `TriviaGame.showSurvivors()` is called after `answer_revealed`
- **THEN** a `survivors_regrouped` event SHALL be broadcast to all players containing the current survivor count and names

### Requirement: Live answer stats stream to admin during question_live
While the game is in `question_live`, the server SHALL send a `live_answer_stats` event to the admin each time a player submits an answer.

#### Scenario: Admin receives stats update on each answer submission
- **WHEN** any player submits an answer during `question_live`
- **THEN** a `live_answer_stats` event SHALL be sent to the admin containing the updated per-option counts, total answered, and remaining (total players minus answered)

### Requirement: Eliminated and surviving players receive individual results
After `revealAnswer()`, each player SHALL receive an individual event indicating their personal outcome.

#### Scenario: Eliminated player receives you_are_eliminated
- **WHEN** a player's answer does not match the correct answer (or they did not answer)
- **THEN** `you_are_eliminated` SHALL be sent to that player only, containing `correctAnswer` and `yourAnswer` (or `null` for no answer)

#### Scenario: Surviving player receives you_survived
- **WHEN** a player's answer matches the correct answer
- **THEN** `you_survived` SHALL be sent to that player only, containing the current `survivorCount`

### Requirement: game_over broadcast on final question
When `TriviaGame.showSurvivors()` transitions to `game_over`, the server SHALL broadcast a `game_over` event to all players.

#### Scenario: game_over broadcast contains winner names
- **WHEN** the game transitions to `game_over`
- **THEN** a `game_over` event SHALL be broadcast to all players containing the `winners` array of screen names (may be empty if no survivors)

### Requirement: Bingo sessions are unaffected by trivia routing
All existing Bingo WebSocket behaviour (create_session, start_game, start_new_round, join, mark_word) SHALL continue to function identically when `gameMode` is `'bingo'`. Adding trivia dispatch paths MUST NOT alter any existing Bingo test expectations.

#### Scenario: Bingo session ignores trivia commands
- **WHEN** a connected client sends `go_live` to a session with `gameMode: 'bingo'`
- **THEN** an `error` event SHALL be returned and the bingo game state SHALL be unchanged

#### Scenario: Trivia session ignores bingo commands
- **WHEN** a connected client sends `mark_word` to a session with `gameMode: 'trivia'`
- **THEN** an `error` event SHALL be returned and the trivia game state SHALL be unchanged
