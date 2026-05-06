# Teams Trivia — Game Overview

**Teams Trivia** is a real-time elimination quiz for all-hands meetings and team events. Players join from any browser by scanning a QR code or visiting a link; no app install needed.

---

## How It Works

1. **Admin sets up** — The host imports a CSV of questions (4–15 questions, four answer options each) and creates a session. A join link or QR code is displayed on the broadcast screen for players to scan.

2. **Players join** — Each player opens the link on their phone or laptop, enters a screen name, and waits in the lobby.

3. **Questions start** — The admin advances through questions one at a time. Each question is shown first as a preview ("get ready"), then goes live with a **10-second countdown**.

4. **Answer or be eliminated** — Players tap A, B, C, or D before time runs out. A wrong answer — or no answer — eliminates them. A correct answer keeps them in the game.

5. **Results revealed** — After the timer expires the broadcast screen shows a live breakdown of how many players picked each option. The correct answer is then revealed and eliminated players are shown.

6. **Survivors advance** — Only players who answered correctly continue to the next question. The remaining survivor count is announced after each round.

7. **Last ones standing win** — The game ends when all questions are exhausted or only one player (or one tied group) remains. Winners are announced on the broadcast screen.

---

## Roles

| Role | Device | View |
|---|---|---|
| **Admin / Host** | Laptop | `/admin/trivia` — uploads questions, controls pacing |
| **Player** | Phone or laptop | `/play` — answer buttons + live status |
| **Broadcast** | Room screen / projector | `/broadcast/trivia` — question text, countdown, results |

---

## Key Rules

- **10 seconds** to answer each question (configurable to 3s with `?speed=true` for testing)
- Wrong answer = eliminated; correct answer = survive
- No answer before the timer = eliminated
- Eliminated players become spectators and can still watch the broadcast
- Ties are allowed — multiple winners can share the final round
