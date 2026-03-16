## Context

`TriviaGame.showSurvivors()` currently transitions to `game_over` only when no more questions remain. When all players are eliminated mid-game, `_survivorIds` is empty but the state transitions to `survivors` — leaving the game in a limbo state where the admin can keep advancing through questions with nobody playing.

The server handler in `ws-handler.ts` already branches on `triviaGame.state === 'game_over'` after calling `showSurvivors()`. This means the server will automatically broadcast `game_over` vs `survivors_regrouped` correctly once the core logic is fixed — no server-side changes are required.

## Goals / Non-Goals

**Goals:**
- `showSurvivors()` transitions to `game_over` when `_survivorIds` is empty, regardless of remaining questions.
- The server broadcasts `game_over` (empty `winners`) automatically via its existing state check.
- All existing `game_over` paths (last question, single survivor, multiple survivors) are preserved.

**Non-Goals:**
- New protocol messages or client UI changes.
- Preventing the admin from seeing the breakdown/reveal screens before game_over (those fire before `showSurvivors()`).
- Handling zero-player sessions (separate concern).

## Decisions

### Decision: Fix in core only, not server

The server's `showSurvivors` handler already reads `triviaGame.state` to decide what to broadcast. Adding `|| this._survivorIds.size === 0` to the `game_over` condition in `showSurvivors()` is the only change needed. Pushing this logic into the server would duplicate the state-transition concern and violate the pure-core contract.

**Alternatives considered:**
- Handle in `ws-handler.ts` by checking survivor count before calling `showSurvivors()` — rejected because state transitions belong in the state machine, not the server.

### Decision: Check `_survivorIds.size === 0` at `showSurvivors()` time

The survivors set is updated by `revealAnswer()` before `showSurvivors()` is called, so the count is accurate at this point. No new state or signal is needed.

### Decision: `getWinners()` returns empty array on all-eliminated

This is already the correct behavior for "no survivors on final question" (existing spec scenario). Reusing the same path is consistent and correct — `winners` will be `[]` and the broadcast already supports that.

## Risks / Trade-offs

- **Risk**: `showSurvivors()` previously accepted a `survivors` state call after the all-eliminated round — callers could have expected to proceed. → **Mitigation**: The state machine throws on illegal transitions; since `game_over` is terminal, any subsequent admin command returns an error as expected. No silent breakage.
- **Trade-off**: The breakdown and reveal screens still display before game_over, meaning the audience sees the correct answer and zero survivors before the game ends. This is intentional — the reveal is informative even in a wipeout round.
