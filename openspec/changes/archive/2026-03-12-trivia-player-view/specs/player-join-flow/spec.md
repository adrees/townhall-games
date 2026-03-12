## ADDED Requirements

### Requirement: Player join form collects screen name and sends join command
The `/play` page SHALL display a name-entry form on load. Submitting the form SHALL send `{ type: 'join', screenName }` to the server over WebSocket. On success (`joined` response), the form SHALL be hidden and the neutral waiting screen shown.

#### Scenario: Player submits name and joins
- **WHEN** a player enters a screen name and clicks Join (or presses Enter)
- **THEN** `{ type: 'join', screenName }` SHALL be sent to the server

#### Scenario: Empty name is rejected client-side
- **WHEN** a player submits the form with a blank screen name
- **THEN** a validation message SHALL be shown and no `join` command SHALL be sent

#### Scenario: joined response hides form and shows waiting screen
- **WHEN** the client receives a `joined` event
- **THEN** the join form SHALL be hidden and a neutral "Waiting for game to start..." screen SHALL be shown

#### Scenario: error response shows message to player
- **WHEN** the client receives an `error` event (e.g., name already taken)
- **THEN** the error message SHALL be displayed on the join form and the form SHALL remain interactive

### Requirement: Auto-join via query parameters skips the name form
If `?name=<value>` is present in the URL on page load, the join flow SHALL be triggered automatically without requiring the player to interact with the form.

#### Scenario: Auto-join fires on DOMContentLoaded with name param
- **WHEN** the page loads with `?name=Alice` in the URL
- **THEN** `{ type: 'join', screenName: 'Alice' }` SHALL be sent automatically once the WebSocket is open, with no form interaction required

#### Scenario: Auto-join with blank name falls back to form
- **WHEN** the page loads with `?name=` (empty value)
- **THEN** the join form SHALL be shown as normal and no auto-join SHALL be attempted

### Requirement: Mode-agnostic join: Bingo and Trivia sessions both handled by /play
The `/play` entry point is not mode-specific. After `joined`, the correct game UI (Bingo or Trivia) activates reactively when the first game-specific server event is received.

#### Scenario: Bingo UI activates on card_dealt
- **WHEN** a joined player receives `card_dealt`
- **THEN** the Bingo grid SHALL be rendered (existing Bingo behaviour unchanged)

#### Scenario: Trivia UI activates on first trivia event
- **WHEN** a joined player receives `question_preview` or `question_live`
- **THEN** the Trivia player UI SHALL activate (see trivia-player-ui spec)
