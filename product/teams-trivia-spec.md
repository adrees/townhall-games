# Teams Trivia — Technical Specification

**townhall-games platform extension · v1.0 · March 2026 · Draft**

| Property | Value |
|---|---|
| Status | Draft — ready for implementation |
| Codebase | townhall-games (extends existing Bingo platform) |
| Platform | Microsoft Teams / any browser |
| Primary use case | Corporate special events — all-hands, offsites |
| Target audience | Hybrid teams (in-person + remote participants) |

---

## 1. Purpose of This Document

This spec describes how to extend the existing `townhall-games` platform to support a second game mode: Teams Trivia. It covers the platform architecture changes, new Trivia core logic, protocol messages, URL structure, and testability conventions.

It is the authoritative reference for implementation. The companion product PRD (`teams-trivia-prd.docx`) describes the user experience in detail. This document describes how to build it.

---

## 2. Platform Architecture Strategy

### 2.1 Game Mode Selection

`townhall-games` becomes a two-mode platform. The admin chooses a game mode during session setup. Everything downstream — question/word configuration, player view, broadcast screen, admin controller — adapts based on the selected mode.

| Shared Infrastructure | Game-Specific |
|---|---|
| Relay / WebSocket architecture | TriviaGame core class (new) |
| Session management + player roster | BingoGame core class (existing, relocated) |
| QR code join flow | Trivia player view (A/B/C/D) |
| Admin controller shell | Bingo player view (existing) |
| Broadcast screen shell | Trivia admin controller |
| URL routing + demo mode | Trivia broadcast screen |
| Fixture system | CSV question import |

### 2.2 Session `gameMode`

`Session` gains a `gameMode` discriminant field. All downstream handlers branch on this value.

```typescript
gameMode: 'bingo' | 'trivia'
```

The relay itself requires no changes — it is transport-only and game-mode agnostic.

---

## 3. URL Structure

### 3.1 Routes

| URL | Purpose |
|---|---|
| `/admin` | Game mode selector — choose Bingo or Trivia |
| `/admin/bingo` | Bingo setup + live controller |
| `/admin/trivia` | Trivia setup (CSV import) + live controller |
| `/play` | Player join — mode-agnostic, session determines game |
| `/broadcast/trivia` | Trivia broadcast screen (presenter shares this) |
| `/broadcast/bingo` | Bingo broadcast screen (future) |

### 3.2 Query Parameters for Testability

| Parameter | Effect |
|---|---|
| `?demo=true` | Pre-loads fixture data — skips CSV import or word list entry |
| `?debug=true` | Adds collapsible live session state JSON panel (dev only) |
| `?speed=true` | Reduces 10s timer to 3s for rapid full-game testing |
| `?session=demo&name=Alice` | Auto-joins as Alice on `/play` — skips name entry form |

> **Example: full local game test in 4 tabs**
>
> ```
> Tab 1:  /admin/trivia?demo=true&debug=true     admin controller with fixture questions
> Tab 2:  /broadcast/trivia?session=demo          broadcast screen
> Tab 3:  /play?session=demo&name=Alice           player 1
> Tab 4:  /play?session=demo&name=Bob             player 2
> ```

---

## 4. Directory Structure

The existing codebase is reorganised to accommodate multiple game modes. Bingo logic moves into a `games/` subdirectory. Trivia sits alongside it.

```
townhall-games/
├── src/
│   ├── core/
│   │   ├── games/
│   │   │   ├── bingo/                  ← bingo-card.ts, bingo-game.ts  (moved, unchanged)
│   │   │   └── trivia/                 ← TriviaGame, TriviaRound, CsvParser  (new)
│   │   ├── session.ts                  ← extended: gameMode-aware
│   │   └── types.ts                    ← extended: trivia types added
│   ├── server/
│   │   ├── routes.ts                   ← new: URL routing
│   │   ├── protocol.ts                 ← extended: trivia messages added
│   │   ├── ws-handler.ts               ← extended
│   │   └── admin-ws-handler.ts         ← extended
│   └── fixtures/
│       ├── trivia-questions.csv        ← 7 sample questions for demo/test
│       └── bingo-words.ts              ← existing word list (moved)
└── public/
    ├── admin/
    │   ├── index.html                  ← mode selector
    │   ├── bingo.html                  ← bingo admin (existing, relocated)
    │   └── trivia.html                 ← trivia admin + controller  (new)
    ├── broadcast/
    │   └── trivia.html                 ← trivia broadcast screen  (new)
    ├── play/
    │   └── index.html                  ← unified player view (mode-aware)  (new)
    └── shared/
        ├── game-client.js              ← shared WS + QR logic
        ├── trivia-player.js            ← trivia-specific player UI
        └── bingo-player.js             ← bingo-specific player UI  (existing)
```

---

## 5. Trivia Core Logic

### 5.1 State Machine

`TriviaGame` is a pure state machine with no I/O dependencies, following the same pattern as `BingoGame`. There are six phases per game.

| State | Trigger | Player View | Admin Controller |
|---|---|---|---|
| `waiting` | Admin starts session | Lobby — name visible in word cloud | See player count, ready to launch |
| `question_preview` | Admin hits Preview | "Get ready..." holding screen | See full question + answers privately |
| `question_live` | Admin hits Go Live | Question + A/B/C/D + 10s countdown | Live answer counts per option |
| `breakdown` | Auto at t=0 (2.5s fixed) | Answer distribution — no correct shown yet | Same breakdown view |
| `answer_revealed` | Auto after breakdown | Correct answer highlighted; eliminated see "You're out" | Eliminated list |
| `survivors` | Auto after animation | Survivor word cloud regroups | Survivor count — manually advance |
| `game_over` | After final question | Winner reveal screen | Game complete |

> **Auto-sequencing rule**
>
> - `question_live → breakdown`: automatic at t=0 (server-side timer)
> - `breakdown → answer_revealed`: automatic after 2.5s fixed delay
> - `answer_revealed → survivors`: automatic after elimination animation (~1.5s)
> - `survivors → next question_preview`: **MANUAL** — presenter controls all advances from here

### 5.2 Elimination Rules

- A player who submits a wrong answer is eliminated on `answer_revealed`
- A player who does not answer within 10 seconds is also eliminated (no answer = wrong)
- Eliminated players become spectators — they see a "You're out" screen but remain connected
- Eliminated players can observe all subsequent breakdown and reveal phases
- Multiple winners are valid — all last survivors after the final question are declared winners

### 5.3 Word Cloud Behaviour

- **Lobby**: player names fly in from random directions as they join
- **`survivors` phase**: remaining names regroup and resize to fill available space
- As player count drops, surviving names grow larger — the visual field narrows dramatically
- **Winner reveal**: final survivor names animate to fill the entire broadcast screen
- Word cloud style is consistent from lobby to winner reveal for visual cohesion

---

## 6. The Reveal Sequence

This is the core dramatic moment of the game. The sequence is automatic from timer expiry through to survivor regroup. The presenter regains manual control at the `survivors` state.

| # | Phase | Duration | Broadcast Screen | Player Phone |
|---|---|---|---|---|
| 1 | Timer expires | Instant | Countdown hits 0, freezes | Answer locked in |
| 2 | Breakdown | 2.5s (fixed) | `A: 4  B: 12  C: 2  D: 1` — no correct shown | "Waiting for results..." |
| 3 | Answer revealed | ~1.5s anim | Correct option highlights; eliminated names begin to drop | Eliminated: "You're out" (correct shown) · Survived: "You're through!" |
| 4 | Survivor regroup | Holds indefinitely | Word cloud regroups + resizes; survivor count shown prominently | Spectator view for eliminated; survivor count for all |
| 5 | Presenter advances | Manual | Advance to next question preview | "Next question incoming..." |

---

## 7. CSV Question Format

### 7.1 Schema

Questions are imported via CSV. This is the only supported import format in V1.

| Column | Description |
|---|---|
| `question` | The question text (required) |
| `a` | Answer option A (required) |
| `b` | Answer option B (required) |
| `c` | Answer option C (required) |
| `d` | Answer option D (required) |
| `correct` | Correct answer: must be `A`, `B`, `C`, or `D` — case-insensitive (required) |

### 7.2 Example

```csv
question,a,b,c,d,correct
"Who founded the company?","Sarah Chen","Mark Davis","Lisa Park","Tom Wright",A
"What year did we launch?","2017","2018","2019","2020",C
"Which city was our first office?","London","New York","Berlin","Singapore",A
```

### 7.3 Validation Rules

On import, the entire file is validated before the game can be configured. If any error is found, the file is rejected with a full error summary.

- Header row must contain exactly: `question, a, b, c, d, correct`
- Every row must have all 6 columns populated
- `correct` must be one of: `A`, `B`, `C`, `D` (case-insensitive)
- Minimum 3 questions, maximum 15 questions per game
- No duplicate question text

On failure, show: `"Import failed. X errors found:"` followed by row numbers and error descriptions.

---

## 8. WebSocket Protocol — Trivia Extensions

The existing `protocol.ts` is extended with trivia-specific message types. All existing Bingo messages are unchanged.

### 8.1 Admin → Server

| Message type | Shape | Description |
|---|---|---|
| `start_trivia_question` | `{ type, questionIndex: 0 }` | Push question to preview state |
| `go_live` | `{ type }` | Transition preview → live, start 10s timer |
| `advance_question` | `{ type }` | Advance from survivors → next preview |

### 8.2 Server → All Players

| Message type | Shape | Description |
|---|---|---|
| `question_live` | `{ type, text, options: ["A","B","C","D"], timeLimit: 10 }` | Question goes live |
| `timer_expired` | `{ type }` | Auto-sent at t=0 |
| `answer_breakdown` | `{ type, counts: {A,B,C,D}, totalAnswered, totalPlayers }` | 2.5s breakdown phase |
| `answer_revealed` | `{ type, correct: "B", eliminated: [ids], survivors: [ids] }` | Correct answer shown |
| `survivors_regrouped` | `{ type, survivorCount, survivorNames: [...] }` | Word cloud regrouped |
| `game_over` | `{ type, winners: ["Alice", "Bob"] }` | Final state |

### 8.3 Server → Individual Player

| Message type | Shape | Description |
|---|---|---|
| `you_are_eliminated` | `{ type, correctAnswer: "B", yourAnswer: "A" }` | Sent only to eliminated players |
| `you_survived` | `{ type, survivorCount: 12 }` | Sent only to surviving players |
| `answer_accepted` | `{ type }` | Confirmation answer was received |

### 8.4 Server → Admin

| Message type | Shape | Description |
|---|---|---|
| `live_answer_stats` | `{ type, counts: {A,B,C,D}, answered, remaining }` | Streaming during `question_live` |
| `question_result` | `{ type, correct: "B", eliminated: [...], survivors: [...] }` | Sent on reveal |

---

## 9. Build Phases

Recommended implementation order. Each phase is independently testable before the next begins.

### Phase 1 — Restructure

- Move `bingo-card.ts` and `bingo-game.ts` into `src/core/games/bingo/`
- Add `gameMode` field to `Session`
- Create `src/core/games/trivia/` skeleton (empty classes)
- Build URL routing: `/admin`, `/admin/bingo`, `/admin/trivia`, `/play`, `/broadcast/trivia`
- Set up `fixtures/` directory and `?demo=true` param handling
- **Verify: all existing Bingo tests still pass**

### Phase 2 — Trivia Core

- Implement `TriviaGame` state machine (6 phases)
- Implement `TriviaRound` — question, answer collection, elimination tracking
- Implement `CsvParser` with full validation logic
- Implement server-side auto-sequencing timer (breakdown → reveal)
- Write unit tests for all core logic — pure functions, no I/O

### Phase 3 — Protocol + Server

- Extend `protocol.ts` with all trivia message types (section 8)
- Extend `ws-handler.ts` and `admin-ws-handler.ts` for trivia
- Server-side timer management and auto-sequencing
- Verify relay compatibility (no relay changes needed)

### Phase 4 — Player View

- Unified `/play` entry point detects game mode from session
- Trivia player: question text + A/B/C/D answer buttons + countdown
- Eliminated state: "You're out" screen with correct answer shown
- Spectator mode: breakdown and reveal visible, no interaction

### Phase 5 — Admin Controller

- Trivia setup: CSV upload + validation error display
- Controller: question queue, preview mode, Go Live button
- Live stats panel: connected players, per-answer counts, survivor count
- Debug panel (visible when `?debug=true` only)

### Phase 6 — Broadcast Screen

- Word cloud lobby — names fly in as players join
- Question display + 10s countdown
- Breakdown bar display (2.5s auto)
- Answer reveal highlight animation
- Name drop animation for eliminated players
- Survivor regroup + resize in word cloud
- Winner reveal — names fill screen

---

## 10. Feature Requirements

| Feature | Priority | Version |
|---|---|---|
| Word cloud lobby with animated name entry | Must Have | V1 |
| QR code join flow (no app download required) | Must Have | V1 |
| Mobile player view — question + A/B/C/D + countdown | Must Have | V1 |
| 10-second hard timer — auto-triggers reveal sequence | Must Have | V1 |
| Answer breakdown display (2.5s, before correct shown) | Must Have | V1 |
| Correct answer reveal with elimination animation | Must Have | V1 |
| Survivor word cloud regroup after each question | Must Have | V1 |
| Eliminated player spectator mode | Must Have | V1 |
| Multiple winners supported | Must Have | V1 |
| CSV question import with validation | Must Have | V1 |
| Admin controller — preview + Go Live + advance | Must Have | V1 |
| Admin controller — live per-answer stats | Must Have | V1 |
| `?demo=true` fixture mode | Must Have | V1 |
| `?debug=true` session state panel | Should Have | V1 |
| `?speed=true` 3s timer mode | Should Have | V1 |
| Teams chat join link alternative to QR | Should Have | V1 |
| Department vs department competition layer | Should Have | V2 |
| Broadcast screen colour-coding by department | Could Have | V2 |
| Post-game results export | Could Have | V2 |
| AI-assisted question generation from company docs | Could Have | V3 |

---

## 11. Out of Scope — V1

- **Session persistence** — if admin closes tab, session is lost (start fresh)
- **Cinematic broadcast screen** — V1 broadcast is functional, not theatrical
- **Department vs department competition**
- **Native Teams app tab** — V1 is browser-based
- **Backwards compatibility with existing Bingo sessions** — Bingo is not actively used
- **Generic trivia content** — all questions are company-specific via CSV
- **Leaderboards persisting between sessions**

---

## 12. Test Strategy

### 12.1 Unit Tests — Core Logic

`TriviaGame` and `TriviaRound` are pure classes with no I/O. Follow the existing `BingoGame` test pattern in `src/core/__tests__/`. Cover:

- State machine transitions — valid and invalid
- Answer collection and elimination logic
- Timer expiry handling
- No-answer elimination
- Multiple winner detection
- `CsvParser` — valid files, and each validation error case individually

### 12.2 Integration — 4-Tab Local Test

Using the demo mode parameters (see section 3.2), a complete game can be run locally in 4 browser tabs with no manual setup. This is the primary integration test workflow during development.

### 12.3 CI

No changes to the CI pipeline. `npm test` must pass on every push. All new core logic has corresponding Jest tests before Phase 3 begins.

---

*townhall-games · Teams Trivia Technical Spec · v1.0 · March 2026 · Draft*
