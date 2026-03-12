## 1. http-server — /play route and subdirectory JS serving

- [x] 1.1 Add `/play` → `play/index.html` to `NAMED_ROUTES` in `src/server/http-server.ts` with roles `['unified', 'relay']`
- [x] 1.2 Fix the JS wildcard handler to support subdirectory paths (e.g., `/shared/trivia-handlers.js` → `public/shared/trivia-handlers.js`): replace `path.basename(pathname)` with a resolved path that is validated to be within `publicDir` (reject with 404 if the resolved path escapes `publicDir`)

## 2. http-server tests

- [x] 2.1 In `src/server/__tests__/http-server.test.ts`, add test: GET `/play` with unified role → 200, serves `play/index.html`
- [x] 2.2 Add test: GET `/play` with relay role → 200
- [x] 2.3 Add test: GET `/play` with admin role → 404 (not in allowlist)
- [x] 2.4 Add test: GET `/shared/trivia-handlers.js` → 200 `application/javascript` (subdirectory JS)
- [x] 2.5 Add test: GET `/shared/../admin/index.html` → 404 (traversal outside publicDir blocked)

## 3. play/index.html — add trivia sections

- [x] 3.1 Add a `triviaSection` div (hidden by default) wrapping all trivia-specific elements
- [x] 3.2 Inside `triviaSection`, add a `triviaWaiting` div: "Get ready..." holding screen (shown during `question_preview`)
- [x] 3.3 Add a `triviaQuestion` div: question text (`<p id="questionText">`), countdown display (`<div id="countdown">`), and four answer buttons (`<button class="answer-btn" data-answer="A/B/C/D">`)
- [x] 3.4 Add a `triviaBreakdown` div: "Waiting for results..." message (shown after `timer_expired`)
- [x] 3.5 Add a `triviaOutcome` div: outcome text (`<p id="outcomeText">`), correct answer display (`<p id="correctAnswerText">`), survivor count (`<p id="survivorCountText">`) — handles `you_survived`, `you_are_eliminated`, `survivors_regrouped`, `game_over`
- [x] 3.6 Add `<script type="module" src="/shared/trivia-handlers.js"></script>` after the existing player.js script tag

## 4. trivia-handlers.js — new shared module

- [x] 4.1 Create `public/shared/trivia-handlers.js` exporting a `triviaHandlers` object (same shape as `handlers` in `handlers.js`)
- [x] 4.2 Implement `question_preview` handler: hide all trivia sub-sections, show `triviaSection` + `triviaWaiting`
- [x] 4.3 Implement `question_live` handler: hide `triviaWaiting`, set `#questionText`, populate button labels from `options`, show `triviaQuestion`, start `setInterval` countdown from `timeLimit`; store interval handle in module-level variable
- [x] 4.4 Implement `timer_expired` handler: clear countdown interval, freeze displayed countdown at 0, disable all answer buttons, hide `triviaQuestion`, show `triviaBreakdown`
- [x] 4.5 Implement `answer_breakdown` handler: show `triviaBreakdown` (no-op if already shown)
- [x] 4.6 Implement `answer_accepted` handler: show a brief "Answer received!" notification (use existing `showNotification` from `ui.js`)
- [x] 4.7 Implement `you_are_eliminated` handler: set `#outcomeText` to "You're out!", display `correctAnswer` and `yourAnswer` (or "No answer" if null) in `#correctAnswerText`, show `triviaOutcome`; set a module-level `eliminated = true` flag
- [x] 4.8 Implement `you_survived` handler: set `#outcomeText` to "You're through!", set `#survivorCountText` to survivor count, show `triviaOutcome`
- [x] 4.9 Implement `survivors_regrouped` handler: update `#survivorCountText`; if eliminated, update spectator message
- [x] 4.10 Implement `game_over` handler: set `#outcomeText` to winner names from `winners` array, show `triviaOutcome`
- [x] 4.11 Add click listener on answer buttons: on click, send `{ type: 'submit_answer', answer }` via `send()` from `ws-client.js`, disable all buttons, mark selected button

## 5. player.js — auto-join and trivia mode activation

- [x] 5.1 On `DOMContentLoaded` in `player.js`, read `?name=` from `location.search`; if present and non-empty, call `joinGame(name)` automatically once the WebSocket `open` event fires (or immediately if already open)
- [x] 5.2 Import `triviaHandlers` from `./trivia-handlers.js` in `player.js`
- [x] 5.3 Extend the message handler to merge trivia handlers: after `joined`, route incoming messages through `triviaHandlers[msg.type]` first, then fall back to existing Bingo `handlers[msg.type]`; this enables reactive mode detection

## 6. Client tests — trivia handlers

- [x] 6.1 In `src/client/__tests__/handlers.test.ts` (or a new `trivia-handlers.test.ts`), add test: `question_live` message shows `triviaQuestion` section and sets question text
- [x] 6.2 Add test: answer button click sends `submit_answer` with correct letter and disables buttons
- [x] 6.3 Add test: `timer_expired` clears countdown and disables buttons
- [x] 6.4 Add test: `you_are_eliminated` shows elimination screen with correct answer; `yourAnswer: null` displays "No answer"
- [x] 6.5 Add test: `you_survived` shows survivor screen with count
- [x] 6.6 Add test: `game_over` shows winner names for both survivors and eliminated spectators

## 7. Verify

- [x] 7.1 Run `npm test` — all new and existing tests pass
- [x] 7.2 Run `npm run build` — TypeScript compiles cleanly
