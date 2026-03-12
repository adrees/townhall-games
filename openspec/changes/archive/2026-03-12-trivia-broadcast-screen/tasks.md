## 1. Broadcast HTML

- [x] 1.1 Replace `public/broadcast/trivia.html` stub with the full multi-phase layout: `#lobbySection` (word cloud `#wordCloud` + player count), `#questionSection` (question text `#questionText`, answer labels `#answerLabels`, SVG countdown ring `#countdownRing`), `#breakdownSection` (four bars `#barA`–`#barD` with count labels), `#revealSection` (reuses breakdown bars with correct highlight), `#survivorSection` (word cloud `#survivorCloud` + survivor count `#survivorCount`), `#winnerSection` (winner names `#winnerNames`)
- [x] 1.2 Add inline styles or a `<style>` block for phase switching (`body[data-phase="lobby"] #lobbySection { display: block }` etc.), word cloud positioning, countdown ring SVG, bar fill transitions, elimination drop animation, winner pop animation, and debug panel
- [x] 1.3 Add `<script type="module" src="/shared/trivia-broadcast.js"></script>` at end of body

## 2. Broadcast ES Module

- [x] 2.1 Create `public/shared/trivia-broadcast.js`: read `?debug` from `location.search`; define `setPhase(name)` helper that sets `document.body.dataset.phase`; connect to WebSocket via `ws-client.js`; wire all incoming events to handlers
- [x] 2.2 Implement lobby: on `player_joined` create a name span, position it off-screen at a random edge, append to `#wordCloud`, then transition to a random in-bounds position using CSS transform; on `player_left` remove the corresponding span
- [x] 2.3 Implement question phase: on `question_live` call `setPhase('question')`, set `#questionText`, render A/B/C/D letter labels in `#answerLabels`, start SVG countdown ring drain using `setInterval` over `timeLimit` seconds
- [x] 2.4 Implement breakdown phase: on `timer_expired` stop countdown interval and call `setPhase('breakdown')`; on `answer_breakdown` set each bar's `style.width` as a percentage of `totalAnswered` and update count labels; do not highlight any bar as correct
- [x] 2.5 Implement reveal phase: on `answer_revealed` add `correct` class to the bar matching `msg.correct`; for each player ID in `msg.eliminated` find the name span in the word cloud, add `eliminated` class (triggers CSS drop animation), then remove from DOM after transition ends
- [x] 2.6 Implement survivor phase: on `survivors_regrouped` call `setPhase('survivor')`, update `#survivorCount` text, reposition remaining name spans to new random positions, rescale font size using `Math.min(48, 14 + (200 / survivorCount))`
- [x] 2.7 Implement winner phase: on `game_over` call `setPhase('winner')`, render winner names in `#winnerNames` (or "No survivors" if empty); apply CSS winner pop animation
- [x] 2.8 Implement debug panel: if `?debug=true`, show `#debugPanel`; update `#debugJson` with `JSON.stringify(msg, null, 2)` on every WebSocket message

## 3. Player ID tracking

- [x] 3.1 Maintain a `Map<playerId, spanElement>` in `trivia-broadcast.js` so that elimination can look up the correct name span by player ID from `answer_revealed.eliminated`; populate on `player_joined`, remove on elimination animation end

## 4. Verification

- [x] 4.1 Run `npm test` — all tests pass
- [x] 4.2 Run `npm run build` — TypeScript compiles cleanly
