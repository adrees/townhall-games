## MODIFIED Requirements

### Requirement: `?demo=true` flag is recognised at the routing layer
The routing layer SHALL recognise the `?demo=true` query parameter on admin and broadcast routes. The parameter MUST be inspectable from `routes.ts` so that other layers can hook into it without touching the HTTP layer. Query parameters are not stripped by the server — they are passed through to the browser unchanged.

#### Scenario: Demo flag is detected on admin/trivia
- **WHEN** a GET request arrives for `/admin/trivia?demo=true`
- **THEN** the routing layer serves `public/admin/trivia.html` and the `?demo=true` param is preserved in the browser URL

#### Scenario: Absence of demo flag is the default
- **WHEN** a GET request arrives for `/admin/trivia` without `?demo=true`
- **THEN** the routing layer serves `public/admin/trivia.html` normally

## ADDED Requirements

### Requirement: `/fixtures/*.csv` static assets are served to all roles
CSV fixture files under `public/fixtures/` SHALL be served at the path `/fixtures/<filename>.csv` with `Content-Type: text/csv`. A request for `/fixtures/trivia-questions.csv` SHALL serve `public/fixtures/trivia-questions.csv`. Path traversal attempts that resolve outside `public/` SHALL be rejected with 404.

#### Scenario: Fixture CSV served correctly
- **WHEN** a GET request arrives for `/fixtures/trivia-questions.csv`
- **THEN** the server responds with the file content, status 200, and `Content-Type: text/csv`

#### Scenario: Path traversal in fixtures request is rejected
- **WHEN** a GET request arrives for `/fixtures/../../../evil.csv`
- **THEN** the server responds with status 404
