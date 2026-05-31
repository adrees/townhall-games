## Why

The platform was originally built for Buzzword Bingo before pivoting to Teams Trivia. Bingo was formally removed in an earlier change, but residual references remain in source code, tests, specs, and product docs. These remnants are misleading — they imply the platform still supports Bingo — and the vestigial `Session` constructor signature clutters every call site.

## What Changes

- **Remove** `/admin/bingo` from the HTTP routing table (`routes.ts`, `http-server.ts`)
- **Simplify** `Session` constructor from `new Session('trivia', [])` to `new Session()` — remove the `gameMode` parameter, `_wordList` parameter, and `gameMode` field (always been hardcoded to `'trivia'`)
- **Update** all call sites of `new Session('trivia', [])` across source and test files (~25 occurrences)
- **Remove** `gameMode: 'trivia'` from all test `create_session` payloads (~13 occurrences; field is silently ignored by the handler)
- **Replace** `mark_word` bingo command in unknown-command tests with a generic `unknown_command` type
- **Delete** `.bingo-grid` and `.cell` CSS rules from `public/style.css`
- **Delete** `product/bingo-spec.md`
- **Update** `CLAUDE.md` to remove bingo references

## Non-goals

- Removing the openspec change archives (historical record of the migration — leave as-is)
- Removing `getLeaderboard()`, `getGameStatus()`, or `getCurrentRound()` from `Session` (separate cleanup, not bingo-specific)
- Any functional changes to trivia game behaviour

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `game-mode-session`: Entire spec describes a bingo/trivia discriminant that no longer exists — replace with trivia-only Session requirements
- `url-routing`: Remove `/admin/bingo` route scenario
- `trivia-server`: Remove bingo `create_session` scenario (bingo mode is not supported)

## Impact

- `src/core/session.ts` — constructor signature + `gameMode` field
- `src/core/__tests__/session.test.ts` — constructor calls + `gameMode` assertion
- `src/server/routes.ts` — route entry
- `src/server/http-server.ts` — route entry
- `src/server/ws-handler.ts` — `new Session(...)` call
- `src/server/admin-ws-handler.ts` — `new Session(...)` call
- `src/server/__tests__/ws-handler.test.ts` — constructor calls, `gameMode` in payloads, `mark_word` test
- `src/server/__tests__/admin-ws-handler.test.ts` — constructor calls
- `src/relay/__tests__/relay-handler.test.ts` — `mark_word` usage
- `src/client/__tests__/ws-client.test.ts` — `mark_word` usage
- `public/style.css` — `.bingo-grid` / `.cell` styles
- `product/bingo-spec.md` — deleted
- `CLAUDE.md` — bingo references removed
