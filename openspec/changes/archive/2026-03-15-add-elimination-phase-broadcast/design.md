## Context

The broadcast page (`public/broadcast/trivia.html` + `public/shared/trivia-broadcast.js`) manages a phase state machine driven by WebSocket messages. Currently the phase sequence is: `lobby → question → breakdown → survivor → winner`. Player name spans are created in `#wordCloud` (inside `#lobbySection`) during lobby, but that section is hidden once the question goes live. The `answer_revealed` event adds `.eliminated` to hidden spans — CSS transitions don't fire on hidden elements, so `transitionend` cleanup never runs, and eliminated players reappear in the survivor cloud.

## Goals / Non-Goals

**Goals:**
- Insert a visible `elimination` phase between `breakdown` and `survivor` where eliminated names animate off-screen
- Fix the `playerSpans` cleanup so eliminated players never appear in the survivor cloud
- Always show the elimination phase (even with zero eliminations) for consistent round cadence

**Non-Goals:**
- Server-side changes — `answer_revealed` already carries the data needed
- Changing the animation style (the existing `.player-name.eliminated` CSS is kept as-is)
- Adding text overlays or banners during the elimination phase

## Decisions

### Decision: Pull `#wordCloud` out of `#lobbySection` as a persistent standalone element

**Rationale:** The word cloud needs to be visible during both `lobby` and `elimination` phases. Making it a persistent sibling element controlled by phase CSS (e.g., `body[data-phase="lobby"] #wordCloud`, `body[data-phase="elimination"] #wordCloud`) is cleaner than duplicating it or showing `#lobbySection` during the elimination phase (which would also reveal the lobby header/count label).

**Alternative considered:** Show `#lobbySection` during `elimination` too, hiding sub-elements. Rejected — fragile, requires hiding multiple child elements.

### Decision: Client-side buffer for `survivors_regrouped`

**Rationale:** The server sends `answer_revealed` and `survivors_regrouped` synchronously in the same `onReveal()` call with no gap. The elimination animation needs ~2 seconds of client time. We buffer `survivors_regrouped` in a `pendingSurvivors` variable and process it once the animation timer fires.

**Alternative considered:** Add a server-side delay between `answer_revealed` and `survivors_regrouped`. Rejected — complicates server timing, affects all clients (player UI, admin) not just broadcast.

### Decision: Fixed 2000ms animation window (not `transitionend`)

**Rationale:** The CSS transition is `0.8s ease-out`. A fixed 2000ms timer gives enough time for the animation to complete and for the audience to absorb who was eliminated, without relying on `transitionend` (which is unreliable on multiple elements and was the original source of the bug). Eliminated spans are removed from `playerSpans` synchronously at the 2000ms mark.

**Alternative considered:** Wait for all `transitionend` events. Rejected — complex to track, same class of bug as current code.

## Risks / Trade-offs

- **[Risk] Word cloud positioned outside phase section** → The `#wordCloud` element will need explicit sizing/positioning CSS since it's no longer inside a flex container. Mitigation: give it fixed `width: 100%; height: 60vh` as a block element, shown/hidden by phase CSS.
- **[Risk] 2000ms feels too long/short** → This is a subjective UX call. The animation is 0.8s; 2s gives ~1.2s of "hold" after names have dropped. Adjustable via a constant in `trivia-broadcast.js`.
- **[Risk] `survivors_regrouped` buffer is never flushed if connection drops mid-animation** → Acceptable — if the socket dies, the page reconnects and resets.

## Migration Plan

Frontend-only change. No deployment coordination required — static files update on next deploy.
