## 1. Protocol Extension

- [x] 1.1 Extend `CreateSessionCommand` in `src/server/protocol.ts` to include `gameMode: 'bingo' | 'trivia'`, `questions?: TriviaQuestion[]`, and `speed?: boolean`
- [x] 1.2 Update `parseCommand` in `src/server/protocol.ts` to parse both bingo (`gameMode: 'bingo'`, `words`) and trivia (`gameMode: 'trivia'`, `questions`, optional `speed`) variants
- [x] 1.3 Update `parseCommand` tests in `src/server/__tests__/protocol.test.ts` for the new trivia create_session shape and to require gameMode on bingo sessions

## 2. Server: Trivia Session Creation

- [x] 2.1 Update `handleBingoAdminCommand` in `src/server/ws-handler.ts` to branch on `command.gameMode`: create a `TriviaGame` + `Session('trivia', [])` when `gameMode === 'trivia'`; keep existing bingo path for `gameMode === 'bingo'`
- [x] 2.2 Apply the same branching to `src/server/admin-ws-handler.ts` for relay mode
- [x] 2.3 Add/update tests in `src/server/__tests__/ws-handler.test.ts` covering trivia `create_session` (creates TriviaGame, responds with session_created, speed flag applies 3s timer)
- [x] 2.4 Add/update tests in `src/server/__tests__/admin-ws-handler.test.ts` for the same trivia session creation path

## 3. Fixture CSV

- [x] 3.1 Create `public/fixtures/trivia-questions.csv` with 7 sample trivia questions in valid `question,a,b,c,d,correct` format
- [x] 3.2 Update `src/server/http-server.ts` to serve `/fixtures/*.csv` files from `public/fixtures/` with `Content-Type: text/csv`, including path-traversal guard
- [x] 3.3 Add tests in `src/server/__tests__/http-server.test.ts` for the `/fixtures/trivia-questions.csv` route (200) and a traversal attempt (404)

## 4. Browser CSV Parser

- [x] 4.1 Create `public/shared/csv-parser.js` as an ES module porting `CsvParser` logic: header validation, row parsing, BOM stripping, trailing blank line removal, returns `{ questions, errors }` (non-throwing)

## 5. Admin HTML

- [x] 5.1 Replace `public/admin/trivia.html` stub with the two-phase UI: setup section (`#setupSection`) with file input, error list `#csvErrors`, question preview table `#questionPreview`, and Start Session button `#startSessionBtn`; controller section (`#controllerSection`) with question queue `#questionQueue`, stats panel `#statsPanel`, result panel `#resultPanel`, and action buttons `#previewBtn`, `#goLiveBtn`, `#advanceBtn`
- [x] 5.2 Add the debug panel `#debugPanel` (collapsible `<details>` with `<pre>`) — present only when `?debug=true` is detected by inline script at page load
- [x] 5.3 Update `public/admin/bingo.html` to send `gameMode: 'bingo'` in its `create_session` command (if it sends one inline) — or verify no change needed

## 6. Admin ES Module

- [x] 6.1 Create `public/shared/trivia-admin.js` that reads `?demo`, `?debug`, `?speed` from `location.search` on load
- [x] 6.2 Implement demo mode in `trivia-admin.js`: fetch `/fixtures/trivia-questions.csv`, parse with `csv-parser.js`, hide file input, enable Start Session
- [x] 6.3 Implement CSV upload flow in `trivia-admin.js`: file input `change` event → parse → display errors in `#csvErrors` → populate `#questionPreview` → enable/disable `#startSessionBtn`
- [x] 6.4 Implement session creation in `trivia-admin.js`: Start Session click → send `create_session` (trivia variant, with `speed` flag if applicable) → on `session_created` hide `#setupSection`, show `#controllerSection`, render question queue
- [x] 6.5 Implement controller event handling in `trivia-admin.js`: wire `#previewBtn` → `start_trivia_question`, `#goLiveBtn` → `go_live`, `#advanceBtn` → `advance_question`; manage button enabled/disabled state based on session state
- [x] 6.6 Implement live stats in `trivia-admin.js`: on `live_answer_stats` update `#statsPanel` with per-answer counts, answered, remaining
- [x] 6.7 Implement result display in `trivia-admin.js`: on `question_result` update `#resultPanel` with correct answer, eliminated players, survivor count; enable Advance button
- [x] 6.8 Implement debug panel in `trivia-admin.js`: if `?debug=true`, update `#debugPanel pre` with `JSON.stringify(event, null, 2)` on every WebSocket message

## 7. Verification

- [x] 7.1 Run `npm test` — all tests pass
- [x] 7.2 Run `npm run build` — TypeScript compiles cleanly
