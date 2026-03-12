## Context

The trivia server engine (Phase 3) and player UI (Phase 4) are complete. The admin controller is the missing piece: a browser UI that uploads questions, creates a trivia session on the server, and drives the game live via the existing WebSocket protocol.

## Goals / Non-Goals

**Goals:**
- Replace the `public/admin/trivia.html` stub with a working two-phase admin UI (setup → controller)
- Allow admin to import questions via CSV upload with immediate client-side validation feedback
- Support `?demo=true` (auto-loads fixture CSV), `?debug=true` (live session-state JSON panel), `?speed=true` (3-second timer)
- Extend `CreateSessionCommand` so the server creates a trivia session with the uploaded questions
- Wire all existing Phase 3 WebSocket events to the controller panel UI

**Non-Goals:**
- Persistent question storage (questions are ephemeral per session)
- Multi-admin support
- Answer breakdown charts / visualisations (counts are shown as plain numbers)

---

## Decisions

### 1. Extend `CreateSessionCommand` for trivia

`CreateSessionCommand` currently only carries `words: string[]`. We add a discriminated variant:

```typescript
// bingo session (unchanged)
{ type: 'create_session', gameMode: 'bingo', words: string[] }

// trivia session (new)
{ type: 'create_session', gameMode: 'trivia', questions: TriviaQuestion[], speed?: boolean }
```

The `gameMode` field is required on both variants so `parseCommand` can branch cleanly. Callers that omit `gameMode` are **rejected** — this is a clean break, not a backwards-compat shim, since the only admin that sends `create_session` is the in-repo admin HTML page.

**Server handling** in `ws-handler.ts` `handleBingoAdminCommand`:
- When `gameMode === 'trivia'`: create `new TriviaGame(sessionId, questions, { speedMode: speed })`, create `new Session('trivia', [])`, register the `TriviaGame` on the handler, send `session_created`.
- When `gameMode === 'bingo'`: existing path, unchanged.

`admin-ws-handler.ts` gets the same treatment for relay mode.

### 2. Single-page two-phase UI with DOM section toggling

The admin page uses the same `show/hide` CSS class pattern (`hidden`) as the player page. Two top-level sections:

- `#setupSection` — visible on load; contains file input, error list, question preview table, Start Session button
- `#controllerSection` — hidden on load; shown after `session_created`; contains question queue, Preview/Go Live/Advance buttons, stats panel

No routing, no SPA framework. JavaScript toggles sections by adding/removing `hidden`.

### 3. Browser-side CSV parser (`public/shared/csv-parser.js`)

A direct port of `src/core/games/trivia/csv-parser.ts` to a plain ES module. It:
- Strips BOM, strips trailing blank lines
- Validates the exact header `question,a,b,c,d,correct`
- Validates each data row: all 6 columns present, `correct` in `{A,B,C,D}`, no empty `question`/option columns
- Returns `{ questions: TriviaQuestion[], errors: string[] }` (non-throwing variant for immediate UI feedback)

This gives immediate row-level error feedback before any server call. The server re-validates on receipt, so this is defence-in-depth, not the only gate.

### 4. Admin ES module (`public/shared/trivia-admin.js`)

A single ES module that:
1. Reads query params (`?demo`, `?debug`, `?speed`) on load
2. If `?demo=true`: fetches `/fixtures/trivia-questions.csv` and auto-parses it, skipping upload
3. Wires file input → parse → display preview/errors
4. On Start Session click: sends `create_session` (trivia variant) over WebSocket
5. On `session_created`: switches to controller section
6. Handles admin-targeted events: `question_result`, `live_answer_stats`
7. If `?debug=true`: shows collapsible `<pre>` updated on every WebSocket event

The module uses the same `ws-client.js` from `public/shared/` (already exists).

### 5. Fixture CSV served as a static asset

`src/fixtures/trivia-questions.csv` is 7 sample questions committed to the repo. The HTTP server already serves everything under `public/`; to keep things simple the fixture is copied to `public/fixtures/trivia-questions.csv` and served at `/fixtures/trivia-questions.csv`. No new server route needed.

**Rationale**: Serving from `public/` is consistent with how all other static assets work. We don't need the fixture on the server classpath — it's only fetched by the browser in demo mode.

### 6. `?speed=true` forwarding

The admin page reads `?speed=true` from its own URL and includes `speed: true` in the `create_session` WebSocket command. The server reads `command.speed` and passes `{ speedMode: true }` to `TriviaGame`. No HTTP layer changes needed.

### 7. Controller question queue rendering

The question list is rendered as `<ol>` items on session start. The currently-previewed question gets a CSS class `current`. Buttons:
- **Preview** (`start_trivia_question { questionIndex: i }`) — loads question into preview; moves `current` highlight
- **Go Live** (`go_live`) — activates countdown; button disabled until timer expires or answer_breakdown received
- **Advance** (`advance_question`) — enabled after `question_result`; moves to next question

Live stats panel shows `live_answer_stats` counts (A/B/C/D + answered/remaining) and `question_result` (correct answer, eliminated/survivor lists).

---

## Risks / Trade-offs

- **Bingo `create_session` compatibility**: Adding `gameMode` as required breaks any client that sends the old `{ type: 'create_session', words: [...] }` shape. Acceptable because only `public/admin/bingo.html` does this — we update it in the same change.
- **Duplicate validation logic**: Browser CSV parser must stay in sync with server `CsvParser`. Mitigated by: the server is the authoritative gate; the browser parser is for UX only.
- **Fixture as public asset**: CSV is world-readable at `/fixtures/trivia-questions.csv`. Acceptable for a demo fixture of sample questions.
