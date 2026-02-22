### Requirement: Smoke test waits for correct version before asserting
The smoke test script SHALL poll `GET /version` on the target URL at 30-second intervals until the `sha` field in the response matches the expected SHA, before running any other assertions.

#### Scenario: Polling resolves when SHA matches
- **WHEN** the expected SHA is provided and `GET /version` returns a matching `sha`
- **THEN** the smoke test proceeds to run assertions

#### Scenario: Polling times out after 10 minutes
- **WHEN** 10 minutes elapse without a matching SHA response
- **THEN** the smoke test exits with a non-zero exit code and prints a timeout message

#### Scenario: SHA check skipped when no expected SHA provided
- **WHEN** no expected SHA is provided (env var absent)
- **THEN** the smoke test proceeds directly to assertions after the server is reachable

### Requirement: Smoke test verifies all static assets return 200
The smoke test SHALL make a GET request for each player-facing static asset and assert HTTP 200 with the correct `Content-Type` header.

Assets checked:
- `/` → `text/html`
- `/style.css` → `text/css`
- `/player.js` → `application/javascript`
- `/ws-client.js` → `application/javascript`
- `/handlers.js` → `application/javascript`
- `/ui.js` → `application/javascript`
- `/state.js` → `application/javascript`

#### Scenario: All assets present
- **WHEN** all static assets exist and the server is running
- **THEN** the smoke test passes all asset checks and continues

#### Scenario: A JS file returns 404
- **WHEN** any asset returns a non-200 status
- **THEN** the smoke test prints which asset failed and exits with a non-zero exit code

#### Scenario: Content-Type mismatch
- **WHEN** an asset is served with an unexpected Content-Type header
- **THEN** the smoke test prints the mismatch and exits with a non-zero exit code

### Requirement: Smoke test verifies player WebSocket connectivity
The smoke test SHALL establish a WebSocket connection to the relay at path `/`, wait to receive at least one message, then close the connection.

#### Scenario: Player WebSocket reachable
- **WHEN** the relay is running and the WebSocket server is accepting connections
- **THEN** the connection is established and a message is received within 10 seconds

#### Scenario: Player WebSocket unreachable
- **WHEN** the WebSocket connection cannot be established or no message is received within 10 seconds
- **THEN** the smoke test exits with a non-zero exit code

### Requirement: Smoke test verifies admin WebSocket registration when secret is available
When `RELAY_SECRET` is set in the environment, the smoke test SHALL connect to `/admin`, send an `admin_register` message, and assert an `admin_registered` response is received.

#### Scenario: Admin registration succeeds
- **WHEN** `RELAY_SECRET` is set and the relay is running
- **THEN** the smoke test receives `{"envelope":"admin_registered",...}` within 10 seconds

#### Scenario: Admin already connected during test
- **WHEN** another admin client is already connected to the relay
- **THEN** the smoke test receives `admin_error` with message `"Admin already connected"` and treats this as a non-fatal warning (does not fail the test)

#### Scenario: Admin check skipped when secret absent
- **WHEN** `RELAY_SECRET` is not set in the environment
- **THEN** the admin WebSocket check is skipped and a warning is printed

### Requirement: GHA workflow runs smoke test after unit tests on push to main
A GitHub Actions workflow SHALL run the smoke test script against the live Render URL after every push to `main`, and only if the unit test job passes.

#### Scenario: Smoke test triggers after successful unit tests
- **WHEN** a push to `main` causes the unit test job to pass
- **THEN** the smoke test job starts automatically

#### Scenario: Smoke test does not run when unit tests fail
- **WHEN** the unit test job fails
- **THEN** the smoke test job is skipped

#### Scenario: Smoke test failure alerts developer
- **WHEN** the smoke test job fails
- **THEN** the GitHub Actions job exits non-zero, causing GitHub to send a failure notification to the developer

#### Scenario: Smoke test does not run on pull requests
- **WHEN** a pull request is opened or updated (not a push to main)
- **THEN** the smoke test workflow does not trigger
