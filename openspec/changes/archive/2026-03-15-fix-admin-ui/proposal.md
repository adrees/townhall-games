## Why

Two usability issues on the trivia admin page:

1. The "← Game Mode Selector" button links to `/admin`, which immediately redirects back to `/admin/trivia`. It is a dead loop that serves no purpose now that trivia is the only game mode.

2. The stats panel, result panel, and selected-question highlight all use light-coloured backgrounds (`#f4f8ff`, `#f0fff0`, `#fffbe6`) while inheriting the global dark-theme text colour (`#eee` ≈ near-white). The result is white text on a near-white background — effectively unreadable.

## What Changes

- Remove the "← Game Mode Selector" button and its wrapping `<a>` tag from `public/admin/trivia.html`.
- Add explicit dark text colour (`color: #1a1a2e` or equivalent) to `.stats-panel`, `.result-panel`, and `.question-queue li.current` so their light backgrounds are legible.

## Capabilities

### Modified Capabilities
- `trivia-admin-ui`: Admin trivia page layout and readability.

## Impact

- `public/admin/trivia.html` — remove button; add colour fixes to inline `<style>` block
- No JS changes, no server changes, no protocol changes
