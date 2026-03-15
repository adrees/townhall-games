## Why

The broadcast screen never visibly shows players being eliminated — the drop-out animation fires on hidden DOM elements (the word cloud is inside `lobbySection`, which is `display:none` once the question goes live), so the audience sees nothing. Eliminated names then reappear in the survivor cloud because the `transitionend` cleanup never runs on hidden elements.

## What Changes

- A new `elimination` phase is inserted in the broadcast flow between `breakdown` and `survivor`
- `#wordCloud` is moved out of `#lobbySection` to a persistent standalone element, shown during both `lobby` and `elimination` phases via CSS
- On `answer_revealed`, the broadcast switches to `elimination` phase, animates eliminated names off screen, then buffers `survivors_regrouped` until the animation completes (~2s client-side delay) before transitioning to `survivor`
- The `elimination` phase is always shown (even if no one was eliminated) for a consistent round rhythm

## Capabilities

### New Capabilities
- `trivia-broadcast-elimination-phase`: A dedicated broadcast phase that displays the word cloud with eliminated player names animating off screen after `answer_revealed`, before transitioning to the survivor phase

### Modified Capabilities
- `trivia-broadcast-reveal`: The elimination animation now runs in the new `elimination` phase (word cloud visible), not silently on hidden elements during the breakdown phase
- `trivia-broadcast-survivor`: Must tolerate delayed arrival — `survivors_regrouped` is buffered client-side until the elimination animation completes

## Impact

- `public/broadcast/trivia.html` — move `#wordCloud` out of `#lobbySection`; add `elimination` phase CSS rules
- `public/shared/trivia-broadcast.js` — new phase state machine, buffering logic for `survivors_regrouped`, animation timer
- No server changes required — `answer_revealed` already carries `eliminated` and `survivors` arrays
- No protocol changes
