## Why

The trivia server engine (Phase 3), player UI (Phase 4), and admin controller (Phase 5) are complete, but the broadcast screen at `/broadcast/trivia` is still a stub. Phase 6 replaces it with a fully functional presenter display: an animated word cloud lobby, live question + countdown, breakdown bars, answer reveal with elimination animation, survivor regroup, and a winner reveal. This screen is the centrepiece of the live event — the whole room watches it while players answer on their phones.

## What Changes

- Replace stub `public/broadcast/trivia.html` with a multi-phase broadcast display:
  - **Lobby**: animated word cloud where player names fly in as they join
  - **Question phase**: full question text + A/B/C/D labels + 10s animated countdown ring
  - **Breakdown phase**: per-answer count bars (A/B/C/D), no correct answer shown yet (2.5s auto)
  - **Reveal phase**: correct answer highlights; eliminated player names animate out ("drop")
  - **Survivor phase**: surviving names regroup into a resized word cloud; survivor count shown prominently; holds until presenter advances
  - **Winner reveal**: final survivor names animate to fill the entire screen
- Add `public/shared/trivia-broadcast.js` — ES module wiring WebSocket events to the broadcast UI
- Support `?debug=true` query param: collapsible live session-state JSON panel updated on every WebSocket event

## Capabilities

### New Capabilities
- `trivia-broadcast-lobby`: Animated word cloud lobby — player names fly in from random positions as `player_joined` events arrive; names remain visible until the first question goes live
- `trivia-broadcast-question`: Question display phase — shows question text and A/B/C/D answer labels with a 10s animated countdown ring; driven by `question_live` event; ring drains as time passes
- `trivia-broadcast-breakdown`: Breakdown bar display — four proportional bars (A/B/C/D) showing answer counts without revealing the correct answer; shown for 2.5s after `answer_breakdown` event
- `trivia-broadcast-reveal`: Answer reveal and elimination animation — correct option highlights on `answer_revealed`; eliminated player names animate off screen; surviving names remain
- `trivia-broadcast-survivor`: Survivor word cloud regroup — after reveal, remaining names regroup and resize to fill the display; survivor count shown prominently; holds until next question
- `trivia-broadcast-winner`: Winner reveal — after final question, winner names animate to fill the entire broadcast screen; `game_over` event triggers this phase

### Modified Capabilities
- `trivia-debug-panel`: The `?debug=true` debug panel capability now applies to the broadcast screen as well as the admin controller

## Impact

- `public/broadcast/trivia.html` — replaced (currently a stub)
- `public/shared/trivia-broadcast.js` — new ES module
- No server-side changes — broadcast screen is a pure WebSocket subscriber, no new protocol messages required
- All events needed (`player_joined`, `question_live`, `timer_expired`, `answer_breakdown`, `answer_revealed`, `survivors_regrouped`, `game_over`) are already defined in Phase 3
