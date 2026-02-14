import { Session } from './core/session';
import type { GameEvent } from './core/types';
import type { BingoCard } from './core/bingo-card';

const buzzwords = [
  "synergy", "circle back", "low-hanging fruit", "move the needle",
  "paradigm shift", "think outside the box", "take this offline",
  "ping me", "deep dive", "touch base", "bandwidth", "leverage",
  "stakeholder", "alignment", "action items", "best practices",
  "core competency", "drill down", "end of day", "game changer",
  "ideate", "key takeaway", "level set", "net-net", "on my radar",
  "quick win", "reach out", "run it up the flagpole", "streamline",
  "value-add",
];

function printCard(card: BingoCard, name: string): void {
  const grid = card.getGrid();
  const marked = card.getMarked();

  console.log(`\n  ${name}'s Card:`);
  console.log('  ' + '-'.repeat(71));
  for (let r = 0; r < 5; r++) {
    const cells = grid[r].map((word, c) => {
      const display = word.length > 11 ? word.slice(0, 10) + '\u2026' : word;
      const pad = display.padEnd(12);
      return marked[r][c] ? `[${pad}]` : ` ${pad} `;
    });
    console.log('  ' + cells.join(''));
  }
  console.log('  ' + '-'.repeat(71));
}

function formatPattern(pattern: { type: string; row?: number; col?: number; direction?: string }): string {
  switch (pattern.type) {
    case 'horizontal': return `horizontal row ${pattern.row}`;
    case 'vertical': return `vertical column ${pattern.col}`;
    case 'diagonal': return `diagonal (${pattern.direction})`;
    case 'corners': return 'four corners';
    default: return pattern.type;
  }
}

// ─── Set up session ──────────────────────────────────────────────

console.log('\n  Buzzword Bingo - Session Demo');
console.log('  ' + '='.repeat(40));

const session = new Session(buzzwords);
console.log(`  Session ID: ${session.id}`);

// Register event listener to log all events
session.addEventListener((event: GameEvent) => {
  switch (event.type) {
    case 'player_joined':
      console.log(`  [event] ${event.screenName} joined the session`);
      break;
    case 'player_left':
      console.log(`  [event] ${event.screenName} left the session`);
      break;
    case 'game_started':
      console.log(`  [event] Game started (round ${event.roundNumber}) — card dealt to ${event.playerId.slice(0, 8)}...`);
      break;
    case 'new_round_started':
      console.log(`  [event] New round ${event.roundNumber} — card dealt to ${event.playerId.slice(0, 8)}...`);
      break;
    case 'player_won':
      console.log(`  [event] ${event.winnerName} won round ${event.roundNumber} with ${formatPattern(event.pattern)}!`);
      break;
  }
});

// Add players
console.log('\n  Adding players...');
const alice = session.addPlayer('Alice');
const bob = session.addPlayer('Bob');
const carol = session.addPlayer('Carol');

console.log(`  Players: ${session.getPlayers().map(p => p.screenName).join(', ')}`);
console.log(`  Game status: ${session.getGameStatus()}`);

// ─── Play rounds ─────────────────────────────────────────────────

function playRound(roundNum: number): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ROUND ${roundNum}`);
  console.log('='.repeat(60));

  // Show cards
  for (const player of session.getPlayers()) {
    const card = session.getCardForPlayer(player.id);
    if (card) printCard(card, player.screenName);
  }

  // Shuffle the buzzwords to simulate a meeting
  const calledWords = [...buzzwords];
  for (let i = calledWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [calledWords[i], calledWords[j]] = [calledWords[j], calledWords[i]];
  }

  console.log('\n  Meeting starts... words are being said:\n');

  for (const word of calledWords) {
    if (session.getGameStatus() === 'finished') break;

    console.log(`  Speaker says: "${word}"`);

    for (const player of session.getPlayers()) {
      const result = session.markWord(player.id, word);

      if (result.success && result.bingo) {
        console.log(`\n  *** BINGO! ${result.winnerName} won with ${formatPattern(result.pattern!)}! ***\n`);
        const card = session.getCardForPlayer(player.id);
        if (card) printCard(card, player.screenName);
        return;
      }
    }
  }
}

// Round 1
console.log('\n  Starting game...');
session.startGame();
playRound(1);

// Late joiner between rounds
console.log('\n  Dave joins late...');
const dave = session.addPlayer('Dave');

// Round 2
session.startNewRound();
playRound(2);

// Someone leaves
console.log('\n  Carol leaves...');
session.removePlayer(carol.id);

// Round 3
session.startNewRound();
playRound(3);

// ─── Final leaderboard ───────────────────────────────────────────

console.log(`\n${'='.repeat(60)}`);
console.log('  FINAL LEADERBOARD');
console.log('='.repeat(60));

const leaderboard = session.getLeaderboard();
for (let i = 0; i < leaderboard.length; i++) {
  const entry = leaderboard[i];
  const medal = i === 0 && entry.totalPoints > 0 ? ' <<< Leader!' : '';
  console.log(
    `  ${i + 1}. ${entry.screenName.padEnd(10)} ${String(entry.totalPoints).padStart(4)} pts` +
    `  (${entry.roundsWon} round${entry.roundsWon !== 1 ? 's' : ''} won)${medal}`
  );
}

console.log(`\n  Game status: ${session.getGameStatus()}`);
console.log(`  Total rounds played: ${session.getCurrentRound()}`);
console.log();
