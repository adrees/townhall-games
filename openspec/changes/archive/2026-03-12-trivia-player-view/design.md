## Context

The server-side Trivia implementation (Phases 1–3) is complete. The existing player UI at `public/play/index.html` is Bingo-only: it renders a 5×5 grid and handles `card_dealt` / `mark_result`. The shared modules (`ws-client.js`, `state.js`, `ui.js`, `handlers.js`, `player.js`) are already ES modules served from `public/shared/`. Phase 4 adds Trivia player behaviour on top of this foundation without altering the server.

## Goals / Non-Goals

**Goals:**
- Add A/B/C/D answer buttons + 10s countdown timer driven entirely by server events
- Show per-player outcome screens (`you_survived`, `you_are_eliminated`)
- Support spectator mode for eliminated players (see breakdown/reveal, no interaction)
- Support auto-join via `?session=demo&name=Alice` query params
- Keep `public/play/index.html` as the single entry point for both Bingo and Trivia players

**Non-Goals:**
- No changes to server-side protocol, WebSocket handlers, or core game logic
- No QR code generation (that is a broadcast-screen concern in Phase 6)
- No word cloud animations (Phase 6)
- No `?debug=true` panel (Phase 5)

## Decisions

### Decision 1: Reactive mode detection (no protocol change)

The `joined` server event does not currently carry a `gameMode` field. Two options:

| Option | Approach |
|---|---|
| A. Extend `JoinedEvent` with `gameMode` | Clean intent signal; requires server-side protocol + handler change |
| B. Reactive detection from first game event | Zero server changes; branch when `card_dealt` or `question_preview`/`question_live` arrives |

**Chosen: Option B.** The proposal explicitly excludes server changes. Reactive detection works cleanly — after `joined` the player sees a neutral "Waiting for game to start..." screen. The first mode-specific event (`card_dealt` → Bingo, `question_preview` or `question_live` → Trivia) triggers the UI switch. The server already sends the correct events for each mode.

### Decision 2: Mode-specific handler modules, shared dispatcher

`handlers.js` currently contains Bingo-only handlers. Rather than growing it with Trivia handlers mixed in, split responsibilities:

- `handlers.js` — shared dispatcher + Bingo handlers (unchanged API)
- `trivia-handlers.js` — Trivia-specific handlers (`question_preview`, `question_live`, `submit_answer` acknowledgement, `timer_expired`, `answer_breakdown`, `answer_revealed`, `you_survived`, `you_are_eliminated`, `survivors_regrouped`, `game_over`)
- `player.js` — orchestrates: on `joined`, register both handler sets; first mode-specific event triggers UI switch

This keeps handler files focused and avoids coupling Bingo and Trivia state.

### Decision 3: Single HTML file, toggled sections

Rather than separate `bingo-player.html` and `trivia-player.html`, keep one `play/index.html` with both Bingo and Trivia sections hidden by default. Mode detection unhides the correct section. This keeps URL routing simple and avoids duplicating join-form markup.

### Decision 4: Countdown timer is client-driven from `timeLimit`

The `question_live` event carries `timeLimit` (seconds). The player client runs its own `setInterval` countdown from that value. It does not need a server clock sync — the countdown is cosmetic; the server timer is authoritative. The client countdown freezes on `timer_expired`.

### Decision 5: Auto-join via query params

On `DOMContentLoaded`, `player.js` reads `?name=Alice` from `location.search`. If present, it submits the join form automatically (skipping name entry). The `?session=demo` param is informational only client-side — the server identifies the session via the WebSocket connection, not a session token in the URL.

## Risks / Trade-offs

- **Reactive detection has a brief neutral screen** — after `joined`, before the first game event, the player sees "Waiting...". For Bingo this is always true (admin starts game separately). For Trivia a player joining mid-game (after `question_live`) will see "Waiting..." for a fraction of a second before the server doesn't re-send the current question. Late-joining trivia players will see the neutral screen until the next question starts. This is acceptable for V1.

- **Client countdown diverges from server** — `setInterval` can drift. At worst the player sees the countdown reach 0 slightly before or after `timer_expired` arrives. The UI freezes on `timer_expired` regardless. [Risk] → UI always defers to server event for state transitions.

- **No eliminated-player reconnection handling** — if an eliminated player disconnects and reconnects, they re-enter the join flow and won't get re-eliminated automatically. [Risk] → Out of scope for V1; acceptable as eliminated players have no further game actions.
