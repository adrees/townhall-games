## Context

The broadcast screen manages phase transitions via a `data-phase` attribute on `<body>`. The `question` phase renders `#questionSection` (question text + answer labels + countdown ring). When the timer expires the phase switches to `breakdown`, which renders `#breakdownSection` (answer distribution bars only). The question text lives in `#questionSection` and becomes hidden as soon as the phase changes.

`trivia-broadcast.js` is hand-written JS (no TypeScript source). Question text arrives via the `question_live` WebSocket event and is written directly into the DOM at that point.

## Goals / Non-Goals

**Goals:**
- Show the question text above the answer bars during the breakdown phase
- Keep the question text visible through the answer reveal (elimination phase uses the word cloud, so it naturally overlays — nothing to do there)

**Non-Goals:**
- Showing individual answer option text (A: "…") in the breakdown view
- Any visual redesign of the breakdown section beyond adding the text
- Changes to the WebSocket protocol or server

## Decisions

**Store question text in a JS variable, not by reading from the DOM**

When `question_live` fires, store `msg.text` in a module-level variable (`let currentQuestionText = ''`). When `onTimerExpired` transitions to breakdown, write it into a new `#breakdownQuestionText` element.

Alternative considered: read `questionText.textContent` from the `#questionSection` DOM element at transition time. Rejected because it couples two sections' DOM to each other and is fragile if element order ever changes.

**Add a dedicated element inside `#breakdownSection`**

Add `<div id="breakdownQuestionText">` as the first child of `#breakdownSection` in `trivia.html`, styled identically to `#questionText` in the question section (same font-size clamp, bold, centered, max-width).

Alternative considered: reuse the single `#questionText` element via CSS across both sections. Rejected — an element can only live in one place in the DOM; duplicating content via JS into a dedicated element is simpler and explicit.

## Risks / Trade-offs

- **Question text briefly absent during the breakdown → elimination transition**: the elimination phase shows the word cloud and hides the breakdown section, so the question is not shown during elimination. This is acceptable — the reveal has already happened at that point.
- **Styling drift**: the breakdown question text is styled separately from `#questionText`; if question font sizing changes in future it needs updating in two places. Mitigation: use the same CSS class or identical inline style values.

## Migration Plan

Two files change; both are static assets with no build step required:
1. `public/broadcast/trivia.html` — add `<div id="breakdownQuestionText"></div>` inside `#breakdownSection`
2. `public/shared/trivia-broadcast.js` — add `currentQuestionText` variable; populate in `onQuestionLive`; write to element in `onTimerExpired`

No server restart needed. No rollback complexity — revert is a two-file change.
