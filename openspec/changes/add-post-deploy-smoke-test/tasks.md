## 1. Version Endpoint

- [x] 1.1 Capture `RENDER_GIT_COMMIT` and server start timestamp at startup in `relay-main.ts`
- [x] 1.2 Add `GET /version` handler to the HTTP server in `relay-main.ts`, returning `{"sha","startedAt"}` as JSON with correct Content-Type
- [x] 1.3 Add a test for the `/version` endpoint in `src/server/__tests__/` (or relay tests) verifying the response shape and SHA fallback to `"unknown"`

## 2. Smoke Test Script

- [x] 2.1 Create `scripts/smoke-test.js` — read `SMOKE_URL`, `EXPECTED_SHA`, `RELAY_SECRET` from `process.env`
- [x] 2.2 Implement SHA polling loop: poll `GET /version` every 30s, exit with error after 10 minutes if SHA never matches
- [x] 2.3 Implement static asset checks: GET each of the 7 assets, assert HTTP 200 and correct Content-Type header
- [x] 2.4 Implement player WebSocket check: connect to `ws(s)://`, wait for first message within 10s, close cleanly
- [x] 2.5 Implement admin WebSocket check: connect to `ws(s)://` with path `/admin`, send `admin_register`, assert `admin_registered` or treat `admin_error: Admin already connected` as non-fatal warning; skip if `RELAY_SECRET` not set
- [x] 2.6 Ensure script exits 0 on full pass, non-zero on any failure, with clear printed diagnostics for each step

## 3. Package Script

- [x] 3.1 Add `"smoke": "node scripts/smoke-test.js"` to the `scripts` section of `package.json`

## 4. GitHub Actions Workflow

- [x] 4.1 Create `.github/workflows/e2e.yml` — trigger on push to `main` only, with a `smoke` job that `needs: [test]` (referencing the job from `test.yml`)
- [x] 4.2 Set `SMOKE_URL`, `EXPECTED_SHA: ${{ github.sha }}`, and `RELAY_SECRET: ${{ secrets.RELAY_SECRET }}` as env vars on the smoke job
- [x] 4.3 Add workflow steps: checkout, setup Node 18, `npm ci`, `npm run smoke`

## 5. Secrets Setup (manual, outside code)

- [x] 5.1 Add `RELAY_SECRET` to the repository's GitHub Actions secrets via Settings → Secrets and variables → Actions
