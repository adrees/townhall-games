## Why

During a trivia game, the broadcast screen shows the question and answer options while the timer counts down, but when the timer expires and the answer distribution bars appear, the question text disappears. Audience members who lose context mid-reveal have no way to read the question while looking at the breakdown bars or during the answer highlight.

## What Changes

- The breakdown section of the broadcast screen SHALL display the current question text above the answer distribution bars, exactly as it appeared during the live question phase.
- The question text SHALL persist through the full breakdown → reveal → elimination sequence (i.e. it remains visible until the survivor or game-over phase is shown).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `trivia-broadcast-breakdown`: Add requirement that the question text is shown above the answer bars during the breakdown phase and persists through answer reveal.

## Impact

- `public/broadcast/trivia.html` — add a question text element inside `#breakdownSection`
- `public/shared/trivia-broadcast.js` — when transitioning to breakdown, copy the current question text into the new element (already in memory from `question_live`)
- No protocol changes; no server changes; no player UI changes

## Non-goals

- Showing the individual answer option text (A: "...", B: "...") in the breakdown view — the bars labelled A–D are sufficient context alongside the question text
- Any styling changes beyond positioning the question text above the bars
