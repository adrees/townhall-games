## 1. HTML restructure

- [x] 1.1 Move `#wordCloud` out of `#lobbySection` to be a standalone sibling element in `trivia.html`
- [x] 1.2 Add `#eliminationSection` div as a new phase section (alongside lobby, question, breakdown, survivor, winner)

## 2. CSS phase rules

- [x] 2.1 Add `body[data-phase="elimination"] #eliminationSection { display: flex; }` rule
- [x] 2.2 Update `#wordCloud` visibility: show during `lobby` and `elimination` phases, hidden otherwise (remove from lobbySection's implicit visibility)
- [x] 2.3 Ensure `#wordCloud` sizing/positioning is correct as a standalone block element (width 100%, height 60vh)

## 3. JS: elimination phase logic

- [x] 3.1 Add `pendingSurvivors` variable and `eliminationAnimating` flag to `trivia-broadcast.js`
- [x] 3.2 Update `onAnswerRevealed`: set `eliminationAnimating = true`, call `setPhase('elimination')`, apply `.eliminated` class to eliminated spans
- [x] 3.3 Add 2000ms timer in `onAnswerRevealed` that: removes eliminated IDs from `playerSpans`, sets `eliminationAnimating = false`, flushes `pendingSurvivors` if buffered
- [x] 3.4 Update `onSurvivorsRegrouped`: if `eliminationAnimating` is true, store msg in `pendingSurvivors` and return early

## 4. Verification

- [x] 4.1 Run `npm test` — all tests pass
- [ ] 4.2 Manual smoke test: one player joins, go live, let timer expire without answering — word cloud visible with name dropping out, survivor phase shows 0 survivors
- [ ] 4.3 Manual smoke test: two players, one answers correctly — elimination phase shows wrong-answerer dropping, survivor phase shows one survivor
