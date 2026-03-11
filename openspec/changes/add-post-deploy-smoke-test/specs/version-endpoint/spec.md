## ADDED Requirements

### Requirement: Version endpoint exposes deployed SHA
The relay HTTP server SHALL expose a `GET /version` endpoint that returns a JSON object containing the deployed git SHA and a server start timestamp.

#### Scenario: Successful version response
- **WHEN** a GET request is made to `/version`
- **THEN** the server responds with HTTP 200, `Content-Type: application/json`, and a body of the form `{"sha":"<value>","startedAt":"<ISO8601>"}`

#### Scenario: SHA populated from environment
- **WHEN** the `RENDER_GIT_COMMIT` environment variable is set at server startup
- **THEN** the `sha` field in the response equals the value of that variable

#### Scenario: SHA unknown when env var absent
- **WHEN** `RENDER_GIT_COMMIT` is not set at server startup
- **THEN** the `sha` field in the response is the string `"unknown"`

#### Scenario: Endpoint does not require authentication
- **WHEN** any HTTP client makes a GET request to `/version` without any credentials
- **THEN** the server responds with HTTP 200 (not 401 or 403)
