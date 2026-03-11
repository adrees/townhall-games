## Context

`townhall-games` is a Node.js/TypeScript WebSocket platform that currently serves a single game mode: Buzzword Bingo. Game logic lives flat in `src/core/`, and the HTTP server (`http-server.ts`) serves two static files at fixed paths. There is no URL routing layer.

Phase 1 is a pure structural refactor — no game mechanics change. All existing Bingo tests must pass unchanged after the restructure. No relay changes are needed.

## Goals / Non-Goals

**Goals:**
- Relocate bingo source files into `src/core/games/bingo/` without changing any logic
- Add `gameMode` discriminant to `Session` so server handlers can branch in future phases
- Create a `src/core/games/trivia/` skeleton (empty classes only — no logic)
- Replace ad-hoc static file serving with a proper `routes.ts` routing table
- Restructure `public/` to match the URL structure defined in the spec (§3.1)
- Add `src/fixtures/` with sample data files
- Wire `?demo=true` at the routing layer (skeleton — no trivia effect yet)

**Non-Goals:**
- No trivia game logic — Phase 2
- No protocol changes — Phase 3
- No new frontend behaviour — Phases 4–6
- No relay changes
- No changes to existing Bingo test expectations

## Decisions

### D1 — Move files without modifying logic

Move `bingo-card.ts` and `bingo-game.ts` verbatim into `src/core/games/bingo/`. Update import paths in all consumers (server handlers, test files). Do not alter class signatures or behaviour. This keeps the diff reviewable and ensures test re-runs confirm nothing broke.

_Alternative considered_: Re-export from old paths for backwards compatibility. Rejected — there are no external consumers; keeping stale re-exports adds noise and defeats the purpose of the restructure.

### D2 — `gameMode` as a constructor parameter on `Session`

Add `gameMode: 'bingo' | 'trivia'` as a required constructor argument to `Session`. Existing call sites pass `'bingo'`. This makes the discriminant explicit at construction time and avoids nullable state.

_Alternative considered_: Derive `gameMode` from the type of game object passed in. Rejected — the type would need to be inferred at runtime and would couple `Session` more tightly to concrete game classes.

### D3 — `routes.ts` as a thin routing table, not a framework

`routes.ts` exports a single `registerRoutes(app: HttpServer)` function that maps URL prefixes to `public/` subdirectory paths and handles query param inspection for `?demo=true`. It replaces the current two hard-coded `serveFile` calls in `http-server.ts`.

No new dependencies. The existing `http-server.ts` request handler is refactored to call `registerRoutes`.

_Alternative considered_: Express.js router. Rejected — the server already uses Node's built-in `http` module; adding a framework dependency for a routing table is over-engineering for Phase 1.

### D4 — `public/` restructured to match URL layout exactly

Files move to match the spec §3.1 URL structure:
- `public/index.html` (player) → `public/play/index.html`
- `public/admin.html` → `public/admin/bingo.html`
- New stub files: `public/admin/index.html`, `public/admin/trivia.html`, `public/broadcast/trivia.html`

Stub pages for trivia routes render a placeholder message — no JS wired yet.

### D5 — `src/fixtures/` holds static data files

`bingo-words.ts` (currently inlined in the server) moves to `src/fixtures/bingo-words.ts`. A `trivia-questions.csv` with 7 sample rows is added. No runtime CSV parsing in Phase 1 — the file exists so the routing layer can serve it via `?demo=true` and Phase 2 has a real fixture to parse.

## Risks / Trade-offs

- **Import path churn** → All `__tests__` files that import from `src/core/bingo-*.ts` must be updated. Risk: a missed import silently compiles because TypeScript path resolution is permissive. Mitigation: `npm run build` must produce zero errors, and `npm test` must pass fully before the branch is merged.

- **`public/` restructure breaks existing bookmarked URLs** → The old `/` (player) and `/admin` paths change. Mitigation: acceptable per §11 ("no backwards compatibility with existing Bingo sessions"). Optionally add HTTP 301 redirects from old paths in `routes.ts` as a low-effort safety net.

- **Trivia skeleton classes must not interfere** → Empty placeholder classes in `src/core/games/trivia/` could cause TypeScript errors if they import types not yet defined. Mitigation: skeleton files export empty classes only — no imports, no type references.
