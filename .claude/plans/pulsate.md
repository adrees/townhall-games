# Plan: Winning cells swell & pulsate animation on bingo win

## Context
When a player wins a round of Buzzword Bingo, the winning pattern cells (the row, column, diagonal, or corners that completed the bingo) should visually celebrate with a swell-and-pulsate animation. Currently the win banner pulses, but the actual grid cells don't animate.

## Changes

### 1. Add CSS animation in `public/style.css`

Add a `@keyframes bingo-pulse` animation that scales cells up and down repeatedly, and a `.cell.winning` class that applies it:

```css
@keyframes bingo-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.cell.winning {
  animation: bingo-pulse 0.8s ease-in-out infinite;
  z-index: 1;
  box-shadow: 0 0 12px rgba(233, 69, 96, 0.6);
}
```

### 2. Update JS in `public/index.html`

**a. Add a helper function `getWinningPositions(pattern)`** that converts a `WinPattern` into an array of `[row, col]` pairs:
- `horizontal` with row N -> all 5 columns in row N
- `vertical` with col N -> all 5 rows in col N
- `diagonal tl-br` -> [0,0],[1,1],[2,2],[3,3],[4,4]
- `diagonal tr-bl` -> [0,4],[1,3],[2,2],[3,1],[4,0]
- `corners` -> [0,0],[0,4],[4,0],[4,4],[2,2]

**b. Update the `player_won` message handler** to call `highlightWinningCells(msg.pattern)` which:
1. Gets winning positions from the pattern
2. Queries cells in the grid by `data-row`/`data-col` attributes
3. Adds the `winning` CSS class to those cells

**c. Update `card_dealt` handler** to clear any `.winning` classes when a new round starts (already re-renders the grid via `renderGrid()`, so this is handled automatically).

## Files to modify
- `public/style.css` — add `@keyframes bingo-pulse` and `.cell.winning` class
- `public/index.html` — add `getWinningPositions()` and `highlightWinningCells()` functions, call from `player_won` handler

## Verification
1. Start the game locally, join with 2+ players
2. Play until one player wins
3. Confirm the winning pattern cells swell and pulsate with the animation
4. Confirm the animation stops when a new round starts (cells re-rendered)
5. Test all win patterns: horizontal, vertical, diagonal, corners
