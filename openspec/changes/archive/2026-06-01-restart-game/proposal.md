## Why

After a game ends, the admin has no way to run another round without refreshing the page and re-uploading the question CSV. At live events this is disruptive — the host needs a fast path to reset and start fresh.

## What Changes

- New `restart_game` admin command tears down the running session and game, broadcasts a `game_reset` event to all connected clients, and returns the admin UI to the setup screen
- `session_created` is broadcast to all connected clients (not just admin) so player UIs can detect when a new session is ready
- Player UI gains a "Rejoin Game" button on the game-over/outcome screen, initially disabled; enables when `session_created` is received; click navigates to `/play?name=<screenName>` which auto-joins via the existing `?name=` param mechanism

## Capabilities

### New Capabilities

- `admin-restart`: Admin command to tear down active session and return to setup, including the `game_reset` event broadcast and player rejoin affordance

### Modified Capabilities

- `trivia-admin-controller`: Adds `restart_game` command to the admin controller protocol and UI
- `trivia-server`: `session_created` is now broadcast to all connected clients; `restart_game` command is handled server-side in both unified and admin handlers
- `trivia-player-ui`: Player outcome screen gains a rejoin flow triggered by `game_reset` / `session_created` events

## Impact

- `src/server/protocol.ts`: new `RestartGameCommand`, `GameResetEvent`
- `src/server/ws-handler.ts`: handle `restart_game`; broadcast `session_created` to all sockets
- `src/server/admin-ws-handler.ts`: same
- `public/shared/trivia-admin.js` (and source): "Restart Game" button, transition back to setup
- `src/client/trivia-handlers.ts` + `public/play/index.html`: rejoin UI on outcome screen
- `src/client/player.ts` or `player.js`: capture screenName on `joined`; handle `game_reset` / `session_created`

## Non-goals

- Restarting with the same questions (admin re-uploads; keeping it simple)
- Confirmation dialog on restart (acceptable risk for now)
- Auto-rejoining players without a page reload
