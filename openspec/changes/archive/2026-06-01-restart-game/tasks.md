## 1. Protocol types

- [x] 1.1 In `src/server/protocol.ts`, add `RestartGameCommand` interface `{ type: 'restart_game' }` and add it to the `Command` union
- [x] 1.2 In `src/server/protocol.ts`, add `GameResetEvent` interface `{ type: 'game_reset' }` and add it to the `ServerEvent` union

## 2. Server — unified handler (ws-handler.ts)

- [x] 2.1 In `src/server/ws-handler.ts`, clear `socketToPlayer` and `playerToSocket` maps and broadcast `game_reset` to all player/spectator sockets in the `restart_game` command handler, then null out `session`, `triviaGame`, and clear `timerHandle`
- [x] 2.2 In `src/server/ws-handler.ts`, handle no-active-session case: if `restart_game` arrives with no session, do nothing (no error, no broadcast)
- [x] 2.3 In `src/server/ws-handler.ts`, after sending `session_created` to admin, also broadcast it to all currently-connected player sockets and spectator sockets

## 3. Server — admin handler (admin-ws-handler.ts)

- [x] 3.1 In `src/server/admin-ws-handler.ts`, add `restart_game` case: cancel timer, broadcast `game_reset` to all players via relay, clear `connectionToPlayer`, `playerToConnection` maps, null out `session` and `triviaGame`
- [x] 3.2 In `src/server/admin-ws-handler.ts`, after `session_created` is sent to admin, also broadcast it to all players via `relay.broadcastToPlayers`

## 4. Admin UI

- [x] 4.1 In `public/admin/trivia.html`, add a "Restart Game" button to the controller section (inside `.btn-row`)
- [x] 4.2 In `public/shared/trivia-admin.js`, wire the Restart Game button: send `{ type: 'restart_game' }`, reset `sessionCreated = false`, `currentQuestionIndex = -1`, hide controller section, show setup section, hide stats/result panels, reset button states

## 5. Player UI

- [x] 5.1 In `public/play/index.html`, add a rejoin section (or add to `triviaOutcome`): a "Waiting for next game..." paragraph and a disabled "Rejoin Game" button with id `rejoinBtn`
- [x] 5.2 In `src/client/trivia-handlers.ts`, capture `screenName` from the `joined` event in a module-level variable (add a `joined` handler or extend the existing one in `handlers.ts`)
- [x] 5.3 In `src/client/trivia-handlers.ts`, add `game_reset` handler: show the rejoin section (or update `triviaOutcome`), disable the rejoin button, display "Waiting for next game..."
- [x] 5.4 In `src/client/trivia-handlers.ts`, add `session_created` handler: enable the rejoin button
- [x] 5.5 In `src/client/player.ts` (or `public/shared/player.js`), wire the rejoin button click: `window.location.href = '/play?name=' + encodeURIComponent(screenName)`

## 6. Tests

- [x] 6.1 In `src/server/__tests__/ws-handler.test.ts`, add: `restart_game` broadcasts `game_reset` to all player sockets; timer is cancelled; subsequent `create_session` succeeds; `session_created` is broadcast to player sockets
- [x] 6.2 In `src/server/__tests__/admin-ws-handler.test.ts`, add: `restart_game` broadcasts `game_reset` via relay; subsequent `create_session` succeeds; `session_created` is relayed to players

## 7. Verify and update docs

- [x] 7.1 Run `npm test` — all tests pass
- [x] 7.2 Run `npm run build && npm run build:client` — both compile cleanly
- [x] 7.3 Update `CLAUDE.md` WebSocket protocol section to document `restart_game` command and `game_reset` event
