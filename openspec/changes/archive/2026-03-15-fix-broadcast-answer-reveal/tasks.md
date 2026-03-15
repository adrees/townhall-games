## 1. HTML

- [x] 1.1 Add `<div id="breakdownQuestionText"></div>` as the first child of `#breakdownSection` in `public/broadcast/trivia.html`
- [x] 1.2 Style `#breakdownQuestionText` identically to `#questionText` (same font-size clamp, bold, centered, max-width)

## 2. JavaScript

- [x] 2.1 Add `let currentQuestionText = ''` module-level variable in `public/shared/trivia-broadcast.js`
- [x] 2.2 In `onQuestionLive`, assign `msg.text` to `currentQuestionText`
- [x] 2.3 In `onTimerExpired`, write `currentQuestionText` into `document.getElementById('breakdownQuestionText').textContent`

## 3. Verification

- [ ] 3.1 Manual smoke test: run 4-tab local integration test; confirm question text appears above A/B/C/D bars during breakdown phase
- [x] 3.2 Confirm correct answer is not highlighted during breakdown (no change needed — just verify existing behaviour holds)
