## Context

Phases 3–5 are complete: the trivia server engine, player UI, and admin controller all work. The broadcast screen at `/broadcast/trivia` is the remaining stub. It is a pure read-only WebSocket subscriber — it joins the session, receives all broadcast events, and renders them. It sends no commands to the server. All events it needs (`player_joined`, `player_left`, `question_preview`, `question_live`, `timer_expired`, `answer_breakdown`, `answer_revealed`, `survivors_regrouped`, `game_over`) are already in the Phase 3 protocol.

## Goals / Non-Goals

**Goals:**
- Fully functional broadcast display for the 6 phases of a trivia game
- Smooth CSS-only animations (word cloud entry, countdown ring, bar fill, elimination drop, winner expand) — no external animation libraries
- `?debug=true` support (same pattern as admin controller)

**Non-Goals:**
- V1 is functional, not cinematic — animations are simple transitions, not elaborate particle effects
- No WebGL, Canvas, or third-party libraries
- The broadcast screen does not emit any WebSocket commands (read-only)

---

## Decisions

### 1. Single-page phase switching via CSS class on `<body>` (or root container)

Each game phase maps to a CSS class. The JS sets `document.body.dataset.phase = 'lobby' | 'question' | 'breakdown' | 'reveal' | 'survivor' | 'winner'`. Each phase section (`#lobbySection`, `#questionSection`, etc.) uses `[data-phase="lobby"] #lobbySection { display: block }` to show/hide. No JS-driven `show/hide` calls needed — one attribute change flips the whole UI.

**Rationale**: Simpler than per-element show/hide; easier to add phase-specific CSS transitions; matches how game-state transitions work conceptually.

### 2. Word cloud: absolute-positioned name spans with CSS `transform`

Player names are `<span>` elements absolutely positioned inside a `#wordCloud` div. On `player_joined`, a new span is created, placed off-screen (random edge), then CSS `transition: transform 0.8s ease-out` moves it to a randomly distributed position within the container. Font size is fixed in lobby, then recomputed on `survivors_regrouped` to fill space proportionally.

**No canvas, no external library.** The word cloud is a "scattered names" layout, not a true frequency-weighted word cloud. Names are distributed using a simple random scatter within the container bounds, with a minimum distance heuristic to prevent obvious overlaps.

### 3. Countdown ring: SVG `stroke-dashoffset` animation

The countdown ring is a single SVG `<circle>` with `stroke-dasharray` set to its circumference. The JS sets `stroke-dashoffset` proportionally as time passes, draining the ring. The ring is updated on each `setInterval` tick (1s), driven by the `timeLimit` from `question_live`.

**Rationale**: Pure CSS/SVG, no canvas. Smooth visual, trivial to implement.

### 4. Breakdown bars: CSS width transitions

Four `<div>` bar elements, one per answer. On `answer_breakdown`, the JS computes each option's percentage of `totalAnswered` and sets `style.width`. A CSS `transition: width 0.5s ease` animates the fill. Labels show the raw count. Correct answer is not highlighted during breakdown.

### 5. Reveal: class toggle on the correct option bar

On `answer_revealed`, a `correct` class is added to the winning bar (green highlight). Eliminated player spans in the word cloud get an `eliminated` class that triggers a CSS `transform: translateY(200px); opacity: 0` drop animation before being removed from the DOM after the transition ends.

### 6. Survivor regroup: font-size rescaling

On `survivors_regrouped`, remaining name spans have their font-size increased proportionally: `fontSize = Math.min(48, 14 + (200 / survivorCount))`. Each span is then repositioned using the same random scatter, re-triggering the CSS transition. This gives a visible "regroup" animation as names shift positions and grow.

### 7. Winner reveal: flex centering + font scale

On `game_over`, switch to `#winnerSection`. Winner names are rendered in a large `<div>` with flexbox centering. Font size is computed to fill available width. A CSS `animation: winnerPop 0.6s ease-out` scales from 0.5 to 1.0.

### 8. Broadcast ES module: `public/shared/trivia-broadcast.js`

Imports `ws-client.js` (already exists) for WebSocket connection. Uses the same `connect(handler)` API — the broadcast page just never calls `send()`. The module exports nothing; it is a self-contained side-effect module loaded via `<script type="module">` in the HTML.

### 9. The broadcast screen joins as a player-role connection

The broadcast screen connects to the same WebSocket endpoint as players. It receives all broadcast events. It never sends a `join` command — it is an unauthenticated observer. The server already broadcasts all trivia events to all connected sockets, so no server change is needed.

---

## Risks / Trade-offs

- **Word cloud overlap**: The simple random scatter will occasionally overlap names at high player counts. Acceptable for V1 — the spec notes V1 is "functional, not theatrical".
- **Survivor font scaling**: The formula `14 + (200 / survivorCount)` caps at 48px to prevent absurdly large text with 1 survivor. Adjust as needed during manual testing.
- **No relay-mode broadcast**: The broadcast screen connects to the unified server. In distributed relay mode the broadcast screen would need to connect to the admin server instead. This is a known V1 limitation — not in scope.
