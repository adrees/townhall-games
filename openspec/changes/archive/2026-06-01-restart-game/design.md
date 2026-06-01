## Context

The admin flow is currently one-way: once a session is created the admin UI transitions to the controller section and there is no path back without a page reload. The server's `ws-handler.ts` already handles a second `create_session` cleanly (it tears down state first), but `admin-ws-handler.ts` actively blocks it (`if (session) return error`). Player WebSocket connections remain open after `game_over` and the clients have no signal to show a rejoin affordance.

## Goals / Non-Goals

**Goals:**
- Admin can restart from the controller section without refreshing the browser
- Players see a disabled "Rejoin" button after game ends, enabled once a new session is ready
- Player rejoin navigates to `/play?name=<name>` which auto-joins — no manual name re-entry
- Works in both unified (ws-handler) and distributed (admin-ws-handler) modes

**Non-Goals:**
- Restart with same questions (admin re-uploads; acceptable UX trade-off)
- Confirmation dialog on restart
- Auto-rejoining players without a page reload
- Notifying spectators to reconnect

## Decisions

### D1: New `restart_game` command rather than reusing `create_session`

`create_session` is semantically wrong for teardown-only. A dedicated command signals intent and sidesteps the `if (session)` guard in `admin-ws-handler.ts` without removing a guard that exists for good reason (accidental double-session). `restart_game` is handled separately: it only tears down — the subsequent `create_session` remains the canonical session-creation path.

*Alternative considered:* Remove the guard and allow a second `create_session`. Rejected because it weakens a safety check and mixes teardown with setup in one message.

### D2: Broadcast `session_created` to all connected sockets

Currently `session_created` goes only to the admin socket. Broadcasting it to all connected player sockets gives the player UI a reliable signal to enable the rejoin button with zero new event types. Players who have no interest in rejoining (e.g. fresh page loads) will receive it but ignore it harmlessly.

*Alternative considered:* New `session_ready` event. Rejected as unnecessary protocol complexity.

### D3: Player rejoin via page reload to `/play?name=<name>`

The `?name=` auto-join mechanism already exists (player.js line 38). A reload guarantees the player's UI is in a clean state — no residual countdown timers, animation state, or eliminated flags. The player's screen name is captured client-side on receipt of `joined` and used to build the redirect URL.

*Alternative considered:* In-place rejoin (reset UI state, re-send `join`). Rejected because the player UI has non-trivial local state (countdown interval, `eliminated` flag, button states) that is hard to fully reset without a reload.

### D4: `restart_game` clears `socketToPlayer` / `playerToSocket` maps in unified mode

These maps track which socket belongs to which player. After restart, all player records are invalid. If not cleared, the handler would attempt to route events to stale player IDs on the new session. The maps must be cleared as part of the teardown.

### D5: Admin-ws-handler teardown does NOT clear `connectionToPlayer` from player side

In distributed mode, the relay maintains the physical connections. `handlePlayerDisconnected` is called by the relay when a player disconnects. On restart, the relay doesn't disconnect players — their connections persist. So `connectionToPlayer` and `playerToConnection` should be cleared server-side on restart (same as the unified maps) so stale connection→player mappings don't bleed into the new session.

## Risks / Trade-offs

- **Mid-question restart**: If admin restarts while a question is live, the server-side timer is running. `restart_game` must call `clearTimeout(timerHandle)` before nulling state, otherwise `onTimerExpired` / `onReveal` may fire against a null game. Same pattern as the existing `create_session` teardown. → Mitigated by following the same clearTimeout pattern.

- **Race: player reloads before session exists**: The rejoin button is only enabled after `session_created` is received (broadcast from server after admin creates session). If the player somehow clicks before that, they hit `/play?name=Alice`, auto-join fires, get "No session exists" error, and land on the join form with no name prefill. → Acceptable edge case; the button is disabled until the signal arrives.

- **screenName not available at rejoin time**: The player's screen name must be captured on the `joined` event and stored in module-level state. If the player refreshes before `game_over`, the name is lost and the rejoin button can't be built. → Not a problem in practice: the rejoin flow only exists post-game.
