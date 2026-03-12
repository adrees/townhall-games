## Why

The server-side Trivia engine and player UI are complete, but there is no admin UI to configure a game or control it live. Phase 5 replaces the `public/admin/trivia.html` stub with a fully functional admin controller: CSV question import, a live control panel, real-time answer stats, and an optional debug panel.

## What Changes

- Replace stub `public/admin/trivia.html` with a working two-phase admin UI:
  - **Setup phase**: CSV file upload, client-side parsing and validation error display, question list preview, and a "Start Session" button
  - **Controller phase**: question queue with current question highlighted, Preview and Go Live buttons, live per-answer counts and survivor count during `question_live`, advance button between questions
- Add `public/shared/trivia-admin.js` — admin controller ES module wiring WebSocket events to the UI
- Add `public/shared/csv-parser.js` — browser-side CSV parsing matching the server `CsvParser` validation rules (used for immediate client-side feedback before any server call)
- Support `?demo=true` query param: pre-loads the fixture question set from `src/fixtures/trivia-questions.csv`, skipping the upload step
- Support `?debug=true` query param: show a collapsible live session-state JSON panel updated on every WebSocket event
- Support `?speed=true` query param: passes a hint to the server to use the 3s speed-mode timer (requires server to read this param when creating the session)

## Capabilities

### New Capabilities
- `trivia-csv-import`: Browser-side CSV upload, parsing, and validation error display — mirrors server `CsvParser` rules; shows row-level errors before any server interaction
- `trivia-admin-controller`: Live admin control panel — question queue, Preview/Go Live/Advance buttons, live answer stats panel, survivor count; all driven by WebSocket protocol events already defined in Phase 3
- `trivia-admin-demo-mode`: `?demo=true` pre-loads a fixture question set and auto-creates a trivia session, skipping CSV upload
- `trivia-debug-panel`: `?debug=true` collapsible JSON panel showing live session state — toggled by the query param, never visible in production

### Modified Capabilities
- `url-routing`: `?speed=true` on `/admin/trivia` must be forwarded to session creation so the server creates a speed-mode `TriviaGame` (3s timer); this requires the routing layer to expose the speed flag to the WebSocket handler

## Impact

- `public/admin/trivia.html` — replaced (currently a stub)
- `public/shared/trivia-admin.js` — new ES module
- `public/shared/csv-parser.js` — new ES module (browser port of `CsvParser`)
- `src/fixtures/trivia-questions.csv` — new fixture file (7 sample questions)
- `src/server/ws-handler.ts` and `src/server/admin-ws-handler.ts` — extend `create_session` command to accept `gameMode: 'trivia'`, `questions`, and optional `speed: boolean`; currently `create_session` always creates a bingo session
- `src/server/protocol.ts` — extend `CreateSessionCommand` to carry `gameMode`, `questions`, and `speed` fields
- No changes to `TriviaGame`, `TriviaRound`, or relay
