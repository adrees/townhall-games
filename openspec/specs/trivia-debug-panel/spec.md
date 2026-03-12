## ADDED Requirements

### Requirement: `?debug=true` shows a collapsible live session-state panel
When the admin page is loaded with `?debug=true` in the URL, the UI SHALL render a collapsible panel containing a JSON dump of the most recent WebSocket event. The panel SHALL update on every WebSocket message received. The panel SHALL be absent from the DOM when `?debug=true` is not set.

#### Scenario: Debug panel is present only when debug param is set
- **WHEN** the admin page loads without `?debug=true`
- **THEN** no debug panel element is rendered in the page

#### Scenario: Debug panel is rendered when debug param is set
- **WHEN** the admin page loads with `?debug=true`
- **THEN** a debug panel element is present in the DOM

#### Scenario: Debug panel updates on each WebSocket event
- **WHEN** any WebSocket message is received while `?debug=true` is active
- **THEN** the debug panel's JSON content is updated to reflect the latest event

#### Scenario: Debug panel is collapsible
- **WHEN** the admin clicks the debug panel header
- **THEN** the JSON content toggles between visible and hidden
