## MODIFIED Requirements

### Requirement: Route requests to static pages
The server SHALL map incoming HTTP GET requests to files under `public/` according to a fixed routing table. The routing table SHALL cover: `/admin` → `public/admin/index.html`, `/admin/trivia` → `public/admin/trivia.html`, `/play` → `public/play/index.html`, `/broadcast/trivia` → `public/broadcast/trivia.html`. Unmatched paths SHALL return a 404 response.

#### Scenario: Admin root resolves to mode selector
- **WHEN** a GET request arrives for `/admin`
- **THEN** the server responds with `public/admin/index.html` and status 200

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

#### Scenario: /admin/bingo returns 404
- **WHEN** a GET request arrives for `/admin/bingo`
- **THEN** the server responds with status 404 (route no longer exists)
