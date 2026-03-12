## Why

The Trivia server is complete but players have no UI to interact with it. Phase 4 delivers the browser-side player experience: joining a session, answering questions on a countdown timer, and seeing individual outcomes (survived / eliminated) — turning the working WebSocket protocol into a playable game.

## What Changes

- Add `/play/index.html` — unified player entry point for both Bingo and Trivia sessions
- Add `public/shared/trivia-player.js` — Trivia-specific player UI module (answer buttons, countdown, state machine)
- Add `public/shared/game-client.js` — shared WebSocket connection + QR-code join logic reused by all player views
- Extend existing Bingo player UI (`public/index.html` → `public/play/index.html`) to load the correct mode-specific module based on the `joined` message's game mode context
- Support `?session=demo&name=Alice` query parameters for auto-join (skips name-entry form)
- Eliminated players transition to a spectator view; they still receive and display breakdown/reveal events

## Capabilities

### New Capabilities
- `trivia-player-ui`: A/B/C/D answer buttons, 10s countdown timer, answer-locked state, and individual outcome screens (you_survived / you_are_eliminated) driven entirely by server events
- `player-join-flow`: Unified `/play` entry point — name-entry form, QR-aware join, auto-join via query params, mode detection from `joined` response to load correct UI module

### Modified Capabilities
- `url-routing`: `/play` route and `/play/index.html` static asset are added to the server's named routes; role allowlists for `unified` and `relay` server roles must include the new path

## Impact

- `src/server/http-server.ts` — add `/play` and `/play/index.html` to named routes
- `public/play/index.html` — new file (replaces `public/index.html` for trivia-aware join)
- `public/shared/game-client.js` — new shared ES module
- `public/shared/trivia-player.js` — new ES module
- `public/shared/bingo-player.js` — existing player logic relocated/extracted into module form
- No changes to server-side WebSocket handlers, protocol, or core game logic
