### Requirement: Route requests to mode-specific static pages
The server SHALL map incoming HTTP GET requests to files under `public/` according to a fixed routing table. The routing table SHALL cover: `/admin` → `public/admin/index.html`, `/admin/bingo` → `public/admin/bingo.html`, `/admin/trivia` → `public/admin/trivia.html`, `/play` → `public/play/index.html`, `/broadcast/trivia` → `public/broadcast/trivia.html`. Unmatched paths SHALL return a 404 response.

#### Scenario: Admin root resolves to mode selector
- **WHEN** a GET request arrives for `/admin`
- **THEN** the server responds with `public/admin/index.html` and status 200

#### Scenario: Bingo admin route resolves correctly
- **WHEN** a GET request arrives for `/admin/bingo`
- **THEN** the server responds with `public/admin/bingo.html` and status 200

#### Scenario: Trivia admin route resolves correctly
- **WHEN** a GET request arrives for `/admin/trivia`
- **THEN** the server responds with `public/admin/trivia.html` and status 200

#### Scenario: Player join route resolves correctly
- **WHEN** a GET request arrives for `/play`
- **THEN** the server responds with `public/play/index.html` and status 200

#### Scenario: Trivia broadcast route resolves correctly
- **WHEN** a GET request arrives for `/broadcast/trivia`
- **THEN** the server responds with `public/broadcast/trivia.html` and status 200

#### Scenario: Unknown path returns 404
- **WHEN** a GET request arrives for an unregistered path
- **THEN** the server responds with status 404

### Requirement: Query parameters are passed through to pages
The routing layer SHALL not strip or block query parameters. The served HTML page SHALL receive the full query string as part of the browser URL so that client-side JavaScript can read it.

#### Scenario: Query params reach the client
- **WHEN** a GET request arrives for `/admin/trivia?demo=true&debug=true`
- **THEN** the server serves `public/admin/trivia.html` with status 200 (query params are browser-side only)

### Requirement: `?demo=true` flag is recognised at the routing layer
The routing layer SHALL recognise the `?demo=true` query parameter on admin and broadcast routes. The parameter MUST be inspectable from `routes.ts` so that other layers can hook into it without touching the HTTP layer. Query parameters are not stripped by the server — they are passed through to the browser unchanged.

#### Scenario: Demo flag is detected on admin/trivia
- **WHEN** a GET request arrives for `/admin/trivia?demo=true`
- **THEN** the routing layer serves `public/admin/trivia.html` and the `?demo=true` param is preserved in the browser URL

#### Scenario: Absence of demo flag is the default
- **WHEN** a GET request arrives for `/admin/trivia` without `?demo=true`
- **THEN** the routing layer serves `public/admin/trivia.html` normally

### Requirement: Static assets under `public/` are served by path
Files referenced by HTML pages (CSS, JS modules) SHALL be served by matching the request path to the corresponding file under `public/`. A request for `/shared/game-client.js` SHALL serve `public/shared/game-client.js`.

#### Scenario: CSS file served correctly
- **WHEN** a GET request arrives for `/style.css`
- **THEN** the server responds with the file content and status 200

#### Scenario: Shared JS module served correctly
- **WHEN** a GET request arrives for `/shared/game-client.js`
- **THEN** the server responds with the file content, status 200, and `Content-Type: application/javascript`

### Requirement: `/shared/*.js` static assets are served to unified and relay roles
ES module scripts under `public/shared/` SHALL be served to clients connecting via both the unified server and the relay-connected server. A request for `/shared/<filename>.js` SHALL serve `public/shared/<filename>.js` with `Content-Type: application/javascript`. Path traversal attempts that resolve outside `public/` SHALL be rejected with 404.

#### Scenario: Shared JS module served from unified server
- **WHEN** a GET request arrives for `/shared/trivia-handlers.js` on a unified-role server
- **THEN** the server SHALL respond with `public/shared/trivia-handlers.js` and status 200

#### Scenario: Shared JS module served from relay-connected server
- **WHEN** a GET request arrives for `/shared/game-client.js` on a relay-role server
- **THEN** the server SHALL respond with `public/shared/game-client.js` and status 200

#### Scenario: Path traversal in shared JS request is rejected
- **WHEN** a GET request arrives for `/../../../evil.js` (resolves outside publicDir)
- **THEN** the server SHALL respond with status 404

### Requirement: `/fixtures/*.csv` static assets are served to all roles
CSV fixture files under `public/fixtures/` SHALL be served at the path `/fixtures/<filename>.csv` with `Content-Type: text/csv`. A request for `/fixtures/trivia-questions.csv` SHALL serve `public/fixtures/trivia-questions.csv`. Path traversal attempts that resolve outside `public/` SHALL be rejected with 404.

#### Scenario: Fixture CSV served correctly
- **WHEN** a GET request arrives for `/fixtures/trivia-questions.csv`
- **THEN** the server responds with the file content, status 200, and `Content-Type: text/csv`

#### Scenario: Path traversal in fixtures request is rejected
- **WHEN** a GET request arrives for `/fixtures/../../../evil.csv`
- **THEN** the server responds with status 404
