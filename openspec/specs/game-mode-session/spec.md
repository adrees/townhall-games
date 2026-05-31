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
