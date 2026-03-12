## ADDED Requirements

### Requirement: `/shared/*.js` static assets are served to unified and relay roles
ES module scripts under `public/shared/` SHALL be served to clients connecting via both the unified server and the relay-connected server. A request for `/shared/<filename>.js` SHALL serve `public/shared/<filename>.js` with `Content-Type: application/javascript`.

#### Scenario: Shared JS module served from unified server
- **WHEN** a GET request arrives for `/shared/trivia-handlers.js` on a unified-role server
- **THEN** the server SHALL respond with `public/shared/trivia-handlers.js` and status 200

#### Scenario: Shared JS module served from relay-connected server
- **WHEN** a GET request arrives for `/shared/game-client.js` on a relay-role server
- **THEN** the server SHALL respond with `public/shared/game-client.js` and status 200

#### Scenario: Path traversal in shared JS request is rejected
- **WHEN** a GET request arrives for `/shared/../admin/index.html`
- **THEN** the server SHALL respond with status 404 (basename-only resolution prevents traversal)
