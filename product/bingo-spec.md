# Buzzword Bingo — Game Specification

**townhall-games platform · v1.0 · March 2026**

| Property | Value |
|---|---|
| Status | Paused — spec preserved for future revival |
| Platform | Any browser, no install required |
| Primary use case | Corporate meetings, all-hands, town halls |
| Target audience | Hybrid teams (in-person + remote) |

---

## 1. Concept

Players each receive a unique 5×5 bingo card filled with corporate buzzwords. As the presenter naturally uses those words during a meeting, players mark them off. The first player to complete a winning pattern shouts "Bingo!" and wins the round. The admin can start additional rounds without ending the session.

The game is passive-participation — players don't need to answer questions or make strategic decisions. It's a light engagement layer on top of an existing meeting.

---

## 2. Card Layout

A bingo card is a 5×5 grid of 25 squares.

- **24 squares** are filled with unique words selected randomly from the admin-provided word list.
- **Center square `[2][2]`** is always `FREE` and is pre-marked at card creation.
- Each player receives a **different shuffled card** — no two cards are identical.
- Words are selected via a Fisher-Yates shuffle; only the first 24 are used.

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ synergy  │ leverage │ pivot    │ agile    │bandwidth │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ ideation │ scalable │ holistic │ optimize │streamline│
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ecosystem │alignment │  FREE ✓  │ empower  │deep-dive │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│granular  │ onboard  │innovative│paradigm  │actionable│
├──────────┼──────────┼──────────┼──────────┼──────────┤
│hyperlocal│ disrupt  │blockchain│omnichannel│ stakehld │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

---

## 3. Word List

### Requirements

| Constraint | Value |
|---|---|
| Minimum unique words | 24 (after trimming, filtering blanks, deduplicating) |
| Recommended range | 40–60 words |
| Case sensitivity | Words deduplicated case-insensitively; original casing preserved on card |
| Blank/whitespace entries | Filtered out silently |
| Duplicate entries | Deduplicated silently (first occurrence wins) |

### Default word list (`product/words.txt`)

```
synergy, blockchain, disruptive, scalable, leverage, paradigm, ecosystem,
agile, holistic, bandwidth, streamline, innovative, actionable, pivot,
granular, optimize, stakeholder, empower, ideation, omnichannel, deep-dive,
alignment, hyperlocal, onboarding
```

(24 words — exactly the minimum. A richer list is recommended for real play.)

---

## 4. Win Patterns

A player wins by completing any one of the following patterns. When multiple patterns complete simultaneously, one is returned (priority: horizontal → vertical → diagonal → corners).

### 4.1 Horizontal Row
All 5 squares in any single row are marked.

```
■ ■ ■ ■ ■   ← row 0 wins
□ □ □ □ □
□ □ ✓ □ □
□ □ □ □ □
□ □ □ □ □
```

(5 rows, indexed 0–4)

### 4.2 Vertical Column
All 5 squares in any single column are marked.

```
□ ■ □ □ □
□ ■ □ □ □
□ ■ ✓ □ □   ← col 1 wins
□ ■ □ □ □
□ ■ □ □ □
```

(5 columns, indexed 0–4)

### 4.3 Diagonal
All 5 squares along either main diagonal are marked.

```
■ □ □ □ □       □ □ □ □ ■
□ ■ □ □ □       □ □ □ ■ □
□ □ ✓ □ □  or  □ □ ✓ □ □
□ □ □ ■ □       □ ■ □ □ □
□ □ □ □ ■       ■ □ □ □ □
  tl-br             tr-bl
```

### 4.4 Four Corners + Center
All four corner squares plus the FREE center square are marked.

```
■ □ □ □ ■
□ □ □ □ □
□ □ ✓ □ □
□ □ □ □ □
■ □ □ □ ■
```

---

## 5. Scoring

| Event | Points |
|---|---|
| Win a round | 100 |

- Points accumulate across rounds within a session.
- The leaderboard is sorted by `totalPoints` descending.
- Each player record tracks: `totalPoints`, `roundsWon`, `lastWinRound`.

---

## 6. Multi-Round Play

After a round ends (a player wins), the admin can start a new round:

1. All player cards are cleared and regenerated (new random shuffles from the same word list).
2. Round counter increments.
3. The winner's score is banked to the cumulative leaderboard.
4. Players who joined mid-game remain in the session.

There is no round limit. The admin decides when the session ends.

---

## 7. Late Joiners

A player who joins after the game has already started receives a card immediately (auto-dealt). They can participate from that point forward.

---

## 8. Player Flow

```
Player opens /play?session=<id>
        │
        ▼
Enter screen name → sends join command
        │
        ▼
Server sends joined + current gameStatus + round number
        │
        ├── (if game is waiting) ──► Wait for game_status: active
        │
        └── (if game is active)  ──► Receive card_dealt immediately
                │
                ▼
        Mark words as admin calls them → sends mark_word
                │
                ├── word not on card ──► mark_result { success: false }
                ├── word marked, no win ──► mark_result { success: true, bingo: false }
                └── word marked, win! ──► mark_result { success: true, bingo: true }
                                              + broadcast player_won to all
```

---

## 9. Admin Flow

```
Admin opens /admin/bingo
        │
        ▼
Enter word list (textarea) → sends create_session { gameMode: 'bingo', words: [...] }
        │
        ▼
Receives session_created { sessionId }
        │
        ▼
Share /play?session=<id> QR code / link with players
        │
        ▼
Wait for players to join (see player_joined broadcasts)
        │
        ▼
Click "Start Game" → sends start_game
        │
        ▼
Cards dealt to all players (card_dealt events sent individually)
        │
        ▼
Run the meeting — players mark words as heard
        │
        ▼
Receive player_won broadcast → announce winner
        │
        ▼
Click "New Round" → sends start_new_round
        │
        └── (repeat from "Wait for players" or "Cards dealt")
```

---

## 10. WebSocket Protocol

### Client → Server Commands

```json
// Create a bingo session
{ "type": "create_session", "gameMode": "bingo", "words": ["synergy", "leverage", ...] }

// Start the game (admin only)
{ "type": "start_game" }

// Start a new round after a win (admin only)
{ "type": "start_new_round" }

// Player joins
{ "type": "join", "screenName": "Alice" }

// Player marks a word
{ "type": "mark_word", "word": "synergy" }
```

### Server → Client Events

```json
// Session created (to admin)
{ "type": "session_created", "sessionId": "uuid" }

// Player joined successfully (to joining player)
{ "type": "joined", "playerId": "uuid", "screenName": "Alice", "gameStatus": "waiting", "round": 0 }

// New player arrived (broadcast to all)
{ "type": "player_joined", "playerId": "uuid", "screenName": "Alice", "playerCount": 3 }

// Player disconnected (broadcast to all)
{ "type": "player_left", "playerId": "uuid", "screenName": "Alice", "playerCount": 2 }

// Game status changed (broadcast)
{ "type": "game_status", "status": "active", "round": 1 }

// Card dealt to a player (individual)
{ "type": "card_dealt", "roundNumber": 1, "grid": [["word",...],...],"marked": [[false,...]] }

// Result of marking a word (to the marking player)
{ "type": "mark_result", "success": true, "word": "synergy", "bingo": false, "roundOver": false }

// Someone won (broadcast to all)
{ "type": "player_won", "winnerName": "Alice", "pattern": { "type": "horizontal", "row": 2 }, "roundNumber": 1 }

// Updated scores (broadcast after each game_started, player_won)
{ "type": "leaderboard", "entries": [{ "playerId": "...", "screenName": "Alice", "totalPoints": 100, "roundsWon": 1 }] }

// Error (to requester)
{ "type": "error", "message": "Word list must contain at least 24 unique words, got 10" }
```

---

## 11. Win Pattern Types

```typescript
type WinPattern =
  | { type: 'horizontal'; row: number }     // row 0–4
  | { type: 'vertical'; col: number }       // col 0–4
  | { type: 'diagonal'; direction: 'tl-br' | 'tr-bl' }
  | { type: 'corners' };
```

---

## 12. Core Implementation Notes

These notes are for when development resumes. The implementation was complete at the point of pausing.

### Files (all deleted from main, recoverable from git history)

| File | Purpose |
|---|---|
| `src/core/games/bingo/bingo-card.ts` | Card generation, word marking, win detection |
| `src/core/games/bingo/bingo-game.ts` | Multi-round orchestration, card management per player |
| `src/core/__tests__/bingo-card.test.ts` | 30+ unit tests covering all win patterns, edge cases |
| `src/core/__tests__/bingo-game.test.ts` | Game state machine tests |
| `src/fixtures/bingo-words.ts` | Default word list as TypeScript export |
| `public/admin/bingo.html` | Admin setup + controller UI |

### Key design decisions

- **Card generation is stateless** — `BingoCard.generate(playerId, wordList)` is a static factory; no external dependencies.
- **Marking is case-insensitive** — `"Synergy"` matches `"synergy"` on the card.
- **Word marking is permanent** — there is no unmark operation.
- **Late joiner card deal** — `Session.addPlayer()` auto-generates a card if the game is already active.
- **Win detection priority** — horizontal rows checked first (row 0→4), then vertical columns (col 0→4), then diagonals (tl-br, tr-bl), then corners. First match returned.
- **Winner name enrichment** — `BingoGame` stores `playerId` as winner; `Session.markWord()` enriches with `screenName` before emitting `player_won`.

### Session integration points (after re-adding bingo)

- `Session` constructor needs `gameMode: 'bingo' | 'trivia'` and bingo word list validation
- `Session.startGame()` instantiates `BingoGame` and deals cards
- `Session.markWord()` delegates to `BingoGame`, enriches winner name, updates scores, emits `player_won`
- `GameStartedEvent` and `NewRoundStartedEvent` carry a `BingoCard` reference (for `getGrid()` / `getMarked()`)
- `ws-handler.ts` branches on `session.gameMode` to route admin/player commands

---

## 13. URL Routes (when active)

| Route | Purpose |
|---|---|
| `/admin/bingo` | Admin word-list setup + live game controller |
| `/play` | Mode-aware player view (handles both bingo and trivia) |
| `/admin` | Game mode selector (choose bingo or trivia) |
