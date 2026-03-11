## Context

The relay server runs on Render.com's free tier, auto-deploying from the `main` branch. The existing CI pipeline runs unit tests pre-merge but has no post-deploy verification. Render's built-in health check only confirms HTTP 200 on `GET /` — it cannot detect broken static assets or WebSocket failures.

Two real incidents motivated this change: a build that failed to start, and missing static JS files that broke the player UI while Render reported the service as healthy.

The relay server is the only hosted component. The admin server runs locally and is out of scope.

## Goals / Non-Goals

**Goals:**
- Detect broken static assets (JS modules, CSS) after every deploy
- Detect WebSocket connectivity failures after every deploy
- Guarantee the smoke test runs against the newly deployed commit, not a previous one
- Alert the developer (via GHA job failure) so they can manually roll back via the Render dashboard

**Non-Goals:**
- Automated rollback (adds Render API complexity, manual is sufficient)
- Testing game logic or admin server behaviour
- Staging environment (single production deployment)
- Parsing HTML to derive the asset list dynamically

## Decisions

### SHA-based deploy synchronisation

**Decision**: Poll `GET /version` until the `sha` field matches `GITHUB_SHA` before running assertions.

The core problem is that GitHub Actions and Render both start immediately on a push to `main` and run in parallel. Without synchronisation, the smoke test might run against the previous deploy. Polling on the SHA provides a precise signal that the right commit is live.

**Alternative considered**: Fixed sleep (e.g. 6 minutes). Rejected — imprecise and fragile; free-tier cold starts vary widely.

**Alternative considered**: Render Deploy Webhooks to trigger a separate GHA workflow. Rejected — requires additional setup (a public endpoint to receive the webhook) and is significantly more complex.

### SHA source

**Decision**: Read `RENDER_GIT_COMMIT` from the environment at server startup. Render injects this variable into every deployment's runtime environment automatically. No build-time embedding required.

If the variable is absent (e.g. in local dev), the endpoint returns `"unknown"` for `sha` and the smoke test skips SHA matching.

### Version endpoint placement

**Decision**: Add the `/version` route inline in `relay-main.ts`, not in `http-server.ts`.

`http-server.ts` is a static file server — adding a programmatic route there would conflate concerns. The relay entry point already owns the HTTP server instance and is the right place for an operational endpoint.

### Asset list in smoke test

**Decision**: Hardcoded list of expected assets in the smoke test script.

Parsing `index.html` to derive the asset list dynamically would be more self-updating but adds complexity. The asset list is stable and small; a developer adding a new JS module will know to update the smoke test. The hardcoded list is explicit about what the test actually covers.

### WebSocket test scope

**Decision**: Test two WebSocket paths:
1. Player path (`/`): connect, receive any message, close. The expected response when no admin is connected is `{"type":"error","message":"Game session not available yet..."}` — receiving this confirms the WS server and relay handler are running.
2. Admin path (`/admin`): connect, send `admin_register` with `RELAY_SECRET`, expect `admin_registered`. Skipped if `RELAY_SECRET` is not set in the environment.

Full game-flow testing (player joining, marking words) is out of scope — that is the domain of integration tests, not a deploy smoke test.

### GHA workflow trigger and structure

**Decision**: Separate `e2e.yml` workflow file with `needs: [test]` dependency on the `test` job from `test.yml`. Only runs on push to `main` (not on PRs). Fails loudly — GitHub sends email notification to the developer, who rolls back manually via the Render dashboard.

The `needs` dependency means a broken build that fails unit tests will not waste time on smoke tests.

## Risks / Trade-offs

**Risk**: Free-tier cold start causes timeout → **Mitigation**: 10-minute polling window with 30-second intervals is generous for a cold start; the first successful `GET /version` response ends the wait regardless.

**Risk**: `RELAY_SECRET` not added to GHA secrets → **Mitigation**: Admin WebSocket test is conditional on the env var being set; the rest of the smoke test still runs and provides value.

**Risk**: Another admin client is connected to the live relay during the smoke test → **Mitigation**: The admin WS test connects to `/admin`; if an admin is already connected the relay will send `admin_error: Admin already connected`. The test should tolerate this and not fail on it.

**Risk**: Hardcoded asset list goes stale when new JS modules are added → **Mitigation**: The smoke test fails in CI the moment a new file is referenced in HTML but missing from the asset list — so the developer notices immediately. The list needs manual updating, which is acceptable.

## Open Questions

- None. All decisions made above.
