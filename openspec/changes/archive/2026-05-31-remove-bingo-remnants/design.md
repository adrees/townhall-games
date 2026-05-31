## Context

Buzzword Bingo was removed as a game mode in an earlier change, but the removal was incomplete. The codebase still contains bingo-specific routes, CSS, test vocabulary (`mark_word`), and — most pervasively — a vestigial `Session` constructor signature `('trivia', [])` that was originally designed to discriminate between game modes. Since the platform is now trivia-only, the entire discriminant concept is dead weight.

## Goals / Non-Goals

**Goals:**
- All bingo references removed from production source code, tests, CSS, and docs
- `Session` constructor simplified to no-argument form; `gameMode` field removed
- `/admin/bingo` route removed and returns 404
- Specs updated to reflect trivia-only reality
- All existing tests continue to pass after mechanical updates

**Non-Goals:**
- Removing `getLeaderboard()`, `getGameStatus()`, or scores from `Session` — those are a separate cleanup concern
- Removing openspec archive history — historical record is intentionally preserved
- Any changes to trivia game logic

## Decisions

### Decision: Remove `Session` constructor params entirely (not just restrict to `'trivia'`)

`gameMode` is hardcoded to `'trivia'` in the current implementation — both constructor params are already silently discarded. The constructor `new Session('trivia', [])` is pure noise at every call site.

**Alternatives considered:**
- Keep `gameMode: 'trivia'` as a literal required argument — rejected because it adds verbosity with zero information content.
- Make `gameMode` optional with a default — rejected because defaults obscure intent; a no-arg constructor is cleaner.

### Decision: Replace `mark_word` in tests with `unknown_command`

The test intent is "unrecognised command type returns error" — a valid trivia-mode behaviour. Renaming the test removes the bingo connotation without losing coverage.

### Decision: Delete `product/bingo-spec.md` entirely

CLAUDE.md previously said it was "preserved for future revival." That decision is being reversed — the file adds maintenance burden without benefit. The openspec archive contains full historical context.

### Decision: Update `trivia-admin-controller` spec to remove `gameMode` from `create_session` payload

The `trivia-server` spec already states `create_session` SHALL NOT carry `gameMode`. The `trivia-admin-controller` spec contradicts this. The admin controller spec is brought into alignment.

## Risks / Trade-offs

- **Risk**: A future developer re-adds multi-mode support and expects `gameMode` infrastructure. → **Mitigation**: CLAUDE.md and the openspec archive document the deliberate removal; any revival would be a fresh change.
- **Trade-off**: ~25 call sites need mechanical updating. All are simple argument removal — no logic changes.
