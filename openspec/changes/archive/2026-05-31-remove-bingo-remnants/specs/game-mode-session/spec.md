## REMOVED Requirements

### Requirement: Session holds a `gameMode` discriminant
**Reason**: The platform is trivia-only. The discriminant was introduced to support both Bingo and Trivia; with Bingo removed, carrying a `gameMode` field conveys no information and creates noise at every call site.
**Migration**: Remove `gameMode` argument and field everywhere. `new Session('trivia', [])` → `new Session()`.

### Requirement: Existing Bingo behaviour is unaffected by `gameMode`
**Reason**: Bingo no longer exists. This requirement has no subject.
**Migration**: Delete.

### Requirement: Server handlers can branch on `gameMode`
**Reason**: With a single game mode, there is nothing to branch on. The `mark_word` bingo command handling is removed; unknown commands return an error regardless of game mode.
**Migration**: Remove `session.gameMode` reads from handlers. Unknown commands return `{ type: 'error' }` unconditionally.

## ADDED Requirements

### Requirement: Session constructs without arguments
`Session` SHALL be constructable with no arguments. It SHALL generate a unique UUID for `id` on construction. There SHALL be no `gameMode` field or constructor parameter.

#### Scenario: Session creates with unique ID
- **WHEN** `new Session()` is called
- **THEN** the resulting session has a defined `id` string that is unique across sessions

#### Scenario: Session has no gameMode field
- **WHEN** a `Session` instance is inspected
- **THEN** there is no `gameMode` property (TypeScript compile error if accessed)

#### Scenario: Unknown command type returns error
- **WHEN** a WebSocket client sends a command with an unrecognised `type` field
- **THEN** the server returns `{ type: 'error' }` to that client regardless of session state
