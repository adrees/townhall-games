## 1. Test Housekeeping (do first — keeps suite green throughout)

- [x] 1.1 Update `connectAdmin()` helper in `ws-handler.test.ts` to create a trivia session instead of bingo
- [x] 1.2 Delete all bingo-specific test cases from `ws-handler.test.ts` (create_session bingo, start_game, mark_word, start_new_round, cross-mode bingo block, late-joiner bingo card)
- [x] 1.3 Delete `src/core/__tests__/bingo-card.test.ts`
- [x] 1.4 Delete `src/core/__tests__/bingo-game.test.ts`
- [x] 1.5 Delete the bingo-anchored tests from `src/core/__tests__/session.test.ts` (Session Creation, Player Management, Starting the Game, Event System, Marking Words & Winning, Leaderboard & Scoring, Multi-Round Play, Edge Cases describe blocks — keep the new "Session (trivia mode)" block)
- [x] 1.6 Run `npm test` — all remaining tests must pass

## 2. Core Layer

- [x] 2.1 Delete `src/core/games/bingo/bingo-card.ts`
- [x] 2.2 Delete `src/core/games/bingo/bingo-game.ts`
- [x] 2.3 Remove `WinPattern`, `MarkResult`, `Winner`, `GameStartedEvent`, `NewRoundStartedEvent` from `src/core/types.ts`; update `GameEvent` union to `PlayerJoinedEvent | PlayerLeftEvent`
- [x] 2.4 Simplify `src/core/session.ts`: remove `gameMode`, `wordList`, `BingoGame`/`BingoCard` imports; remove `startGame()`, `startNewRound()`, `markWord()`, `getCardForPlayer()`, `getCurrentWinner()` methods; keep player management, leaderboard, and event system
- [x] 2.5 Run `npm test` — must pass

## 3. Server Protocol & Handler

- [x] 3.1 Simplify `src/server/protocol.ts`: remove `CreateSessionCommand` bingo variant (make it trivia-only: `{ type: 'create_session', questions: TriviaQuestion[], speed?: boolean }`); remove `StartGameCommand`, `StartNewRoundCommand`, `MarkWordCommand`; remove bingo event types (`CardDealtEvent`, `MarkResultEvent`, `PlayerWonBingoEvent`, `LeaderboardEvent`)
- [x] 3.2 Update `parseCommand` in `protocol.ts` to remove bingo command parsing branches
- [x] 3.3 Simplify `src/server/ws-handler.ts`: delete `handleBingoAdminCommand` and `handleBingoPlayerCommand`; remove `gameMode` branching in `handleMessage`; update `create_session` path to always create a trivia session; remove `handleSessionEvent` cases for `game_started` and `new_round_started`
- [x] 3.4 Run `npm test` — must pass

## 4. Client Modules

- [x] 4.1 Remove bingo message handlers from `src/client/handlers.ts`: `card_dealt`, `mark_result`, `player_won` (bingo), `leaderboard`
- [x] 4.2 Remove bingo state from `src/client/state.ts`: `bingo` field in mark result and any bingo-specific state
- [x] 4.3 Run `npm run build:client` — must compile cleanly
- [x] 4.4 Run `npm test` — must pass

## 5. Public HTML & Assets

- [x] 5.1 Delete `public/admin/bingo.html`
- [x] 5.2 Replace `public/admin/index.html` game-mode selector with a redirect or direct link to `/admin/trivia`
- [x] 5.3 Remove bingo sections from `public/play/index.html`: `#playingSection`, `#bingoGrid`, `#winBanner`, `#leaderboardSection` (and any associated bingo script usage)
- [x] 5.4 Delete `src/fixtures/bingo-words.ts`
- [x] 5.5 Delete `public/shared/player.js` bingo references (if any remain after client build)

## 6. Final Validation

- [x] 6.1 Run `npm test` — all tests pass (250, all green)
- [x] 6.2 Run `npm run build && npm run build:client` — both compile cleanly with no TypeScript errors
- [ ] 6.3 Run `npx playwright test` — all e2e tests pass
- [ ] 6.4 Manual smoke: open `/admin/trivia?demo=true&debug=true`, join as player at `/play?session=demo&name=Alice`, confirm trivia flow works end-to-end
- [x] 6.5 Update CLAUDE.md: change "two game modes" to trivia-only; remove bingo from directory structure, URL routes, and dev commands sections
