## 1. Write new tests first (fail before change, pass after)

- [x] 1.1 In `src/server/__tests__/http-server.test.ts`, add: `GET /admin/bingo → 404` (unified and admin roles)
- [x] 1.2 In `src/core/__tests__/session.test.ts`, add: `new Session()` constructs with unique ID and has no `gameMode` field (replace existing `gameMode` test)

## 2. Simplify Session constructor

- [x] 2.1 In `src/core/session.ts`, remove the `gameMode` field, `_gameMode` param, and `_wordList` param — constructor becomes `constructor() { this.id = randomUUID(); }`
- [x] 2.2 Update all `new Session('trivia', [])` call sites to `new Session()`: `src/server/ws-handler.ts`, `src/server/admin-ws-handler.ts`
- [x] 2.3 Update all `new Session('trivia', [])` in tests: `src/core/__tests__/session.test.ts`, `src/server/__tests__/ws-handler.test.ts`, `src/server/__tests__/admin-ws-handler.test.ts`

## 3. Remove bingo routes

- [x] 3.1 In `src/server/routes.ts`, delete the `/admin/bingo` entry from ROUTE_MAP
- [x] 3.2 In `src/server/http-server.ts`, delete the `/admin/bingo` entry from the route table

## 4. Remove bingo from tests

- [x] 4.1 In `src/server/__tests__/ws-handler.test.ts`, remove `gameMode: 'trivia'` from all `create_session` payloads (~13 occurrences)
- [x] 4.2 In `src/server/__tests__/ws-handler.test.ts`, rename the `mark_word` test to `'unrecognised command type returns error'` and change the command to `{ type: 'unknown_command' }`
- [x] 4.3 In `src/relay/__tests__/relay-handler.test.ts`, replace the `mark_word` command with `{ type: 'unknown_command' }`
- [x] 4.4 In `src/client/__tests__/ws-client.test.ts`, replace the `mark_word` command with `{ type: 'unknown_command' }`

## 5. Remove bingo CSS and docs

- [x] 5.1 In `public/style.css`, delete the `.bingo-grid` block and `.cell` block
- [x] 5.2 Delete `product/bingo-spec.md`

## 6. Update CLAUDE.md

- [x] 6.1 Remove "Buzzword Bingo is paused" sentence from project overview
- [x] 6.2 Remove `product/bingo-spec.md` from directory structure
- [x] 6.3 Remove any other bingo references from CLAUDE.md

## 7. Verify

- [x] 7.1 Run `npm test` — all tests pass
- [x] 7.2 Run `npm run build && npm run build:client` — both compile cleanly
