## 1. Relocate Bingo Core Files

- [x] 1.1 Create directory `src/core/games/bingo/`
- [x] 1.2 Move `src/core/bingo-card.ts` → `src/core/games/bingo/bingo-card.ts` (no logic changes)
- [x] 1.3 Move `src/core/bingo-game.ts` → `src/core/games/bingo/bingo-game.ts` (no logic changes)
- [x] 1.4 Update internal import in `bingo-game.ts`: `'./bingo-card'` → `'./bingo-card'` (same dir — verify no change needed)
- [x] 1.5 Update `src/core/session.ts` imports: `'./bingo-game'` → `'./games/bingo/bingo-game'`, `'./bingo-card'` → `'./games/bingo/bingo-card'`
- [x] 1.6 Update `src/core/types.ts` dynamic imports: `import('./bingo-card')` → `import('./games/bingo/bingo-card')`
- [x] 1.7 Update `src/demo.ts` import: `'./core/bingo-game'` → `'./core/games/bingo/bingo-game'`
- [x] 1.8 Update `src/demo-session.ts` import: `'./core/bingo-card'` → `'./core/games/bingo/bingo-card'`
- [x] 1.9 Update `src/core/__tests__/bingo-card.test.ts` import path
- [x] 1.10 Update `src/core/__tests__/bingo-game.test.ts` import path

## 2. Create Trivia Skeleton

- [x] 2.1 Create directory `src/core/games/trivia/`
- [x] 2.2 Create `src/core/games/trivia/trivia-game.ts` with an empty exported `TriviaGame` class (no imports, no logic)
- [x] 2.3 Create `src/core/games/trivia/index.ts` re-exporting `TriviaGame`

## 3. Add `gameMode` to Session

- [x] 3.1 Add `gameMode: 'bingo' | 'trivia'` as a required first parameter to `Session` constructor
- [x] 3.2 Store `gameMode` as a `readonly` public field on `Session`
- [x] 3.3 Update `src/server/ws-handler.ts`: pass `'bingo'` as first arg to `new Session(...)`
- [x] 3.4 Update `src/server/admin-ws-handler.ts`: pass `'bingo'` as first arg to `new Session(...)`
- [x] 3.5 Update `src/demo-session.ts`: pass `'bingo'` as first arg to `new Session(...)`
- [x] 3.6 Update `src/core/__tests__/session.test.ts`: add `'bingo'` as first arg to all `new Session(...)` calls

## 4. Set Up `src/fixtures/`

- [x] 4.1 Create directory `src/fixtures/`
- [x] 4.2 Move bingo word list from wherever it is currently inlined into `src/fixtures/bingo-words.ts` as a named export `BINGO_WORDS`
- [x] 4.3 Update all consumers of the word list to import from `src/fixtures/bingo-words`
- [x] 4.4 Create `src/fixtures/trivia-questions.csv` with header row and 7 sample questions in the schema: `question,a,b,c,d,correct`

## 5. Restructure `public/`

- [x] 5.1 Create directories: `public/admin/`, `public/play/`, `public/broadcast/`, `public/shared/`
- [x] 5.2 Move `public/admin.html` → `public/admin/bingo.html`
- [x] 5.3 Move `public/index.html` → `public/play/index.html`; update any asset paths inside the file
- [x] 5.4 Move JS modules (`public/handlers.js`, `public/player.js`, `public/state.js`, `public/ui.js`, `public/ws-client.js`) → `public/shared/`; update `<script>` src paths in moved HTML files
- [x] 5.5 Create stub `public/admin/index.html` (mode selector placeholder — "Choose Bingo or Trivia" static page)
- [x] 5.6 Create stub `public/admin/trivia.html` (placeholder — "Trivia admin coming in Phase 5")
- [x] 5.7 Create stub `public/broadcast/trivia.html` (placeholder — "Trivia broadcast coming in Phase 6")

## 6. Build `src/server/routes.ts`

- [x] 6.1 Create `src/server/routes.ts` exporting a `registerRoutes` function that accepts the public directory path
- [x] 6.2 Implement routing table: map `/admin` → `admin/index.html`, `/admin/bingo` → `admin/bingo.html`, `/admin/trivia` → `admin/trivia.html`, `/play` → `play/index.html`, `/broadcast/trivia` → `broadcast/trivia.html`
- [x] 6.3 Implement static asset fallback: serve any file by matching request path to `public/<path>` (with directory traversal protection using `path.resolve` guard)
- [x] 6.4 Implement `?demo=true` detection: export a helper `isDemoMode(url: string): boolean` for use by Phase 2
- [x] 6.5 Update `src/server/http-server.ts` to delegate to `registerRoutes` / the new routing logic, removing the old `ROUTES`/`ROLE_ROUTES` tables

## 7. Verify

- [x] 7.1 Run `npm run build` — zero TypeScript errors
- [x] 7.2 Run `npm test` — all existing tests pass
- [x] 7.3 Manually verify `/play`, `/admin/bingo`, and `/admin` load in browser against the local server
