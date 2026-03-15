## Context

`public/admin/trivia.html` has an inline `<style>` block that defines light-coloured backgrounds for three elements:
- `.question-queue li.current` — `background: #fffbe6` (light amber)
- `.stats-panel` — `background: #f4f8ff` (light blue)
- `.result-panel` — `background: #f0fff0` (light green)

The global `style.css` sets `color: var(--text)` (`#eee`, near-white) on `body`. These light-background panels inherit that colour, producing near-white text on near-white backgrounds.

The "← Game Mode Selector" button links to `/admin`, which immediately meta-refreshes back to `/admin/trivia` — a pointless round-trip.

## Goals / Non-Goals

**Goals:**
- Remove the dead "Game Mode Selector" button
- Make stats panel, result panel, and current-question highlight legible

**Non-Goals:**
- Redesigning the dark/light colour scheme globally
- Moving styles to `style.css` — the inline block is intentional for admin-only overrides

## Decisions

**Add `color: #1a1a2e` to the three light-background rules**

`#1a1a2e` is the global `--bg` value — a very dark navy — giving excellent contrast against all three light backgrounds. It is already used elsewhere in the codebase so it is not a new magic number.

Alternative considered: add a CSS custom property `--dark-text`. Rejected — overkill for three one-liner fixes in a file that already uses hardcoded hex values.

**Remove the `<a><button>` element entirely**

The anchor and button are both removed. No redirect, no placeholder link.

## Migration Plan

One file changes: `public/admin/trivia.html`

1. Delete line 26 (`<a href="/admin"><button>← Game Mode Selector</button></a>`)
2. Add `color: #1a1a2e;` to `.question-queue li.current`, `.stats-panel`, and `.result-panel` in the inline `<style>` block

No build step required. No server restart needed.
