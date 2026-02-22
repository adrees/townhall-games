## Why

A push to main can silently break the live service in ways the existing Render health check misses — specifically build failures and missing static JS files. There is currently no automated detection after deploy, and no fast path to recovery.

## What Changes

- Add a `GET /version` HTTP endpoint to the relay server, returning the deployed git SHA and timestamp
- Add a `scripts/smoke-test.js` Node.js script that polls `/version` until the deployed SHA matches the expected commit, then verifies all static assets and WebSocket connectivity
- Add a `.github/workflows/e2e.yml` GitHub Actions workflow that runs the smoke test against the live Render URL after every push to main; job failure triggers a GitHub notification so the developer can manually roll back via the Render dashboard

## Capabilities

### New Capabilities

- `version-endpoint`: HTTP endpoint on the relay server exposing the deployed git SHA, enabling CI to confirm the correct version is live before running assertions
- `post-deploy-smoke-test`: CI smoke test that verifies all player-facing static assets (HTML, CSS, JS modules) and WebSocket connectivity are healthy on the live Render deployment after each merge to main

### Modified Capabilities

<!-- none -->

## Impact

- `src/relay/relay-main.ts` — new `/version` route added to the HTTP server
- `scripts/smoke-test.js` — new file (plain Node.js, no added dependencies)
- `.github/workflows/e2e.yml` — new workflow file
- `package.json` — new `smoke` script entry pointing to the smoke test
