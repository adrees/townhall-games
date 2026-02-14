import { BingoGame } from './core/bingo-game';

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

const players = [
  { id: 'alice', name: 'Alice' },
  { id: 'bob', name: 'Bob' },
  { id: 'carol', name: 'Carol' },
];

function printCard(game: BingoGame, playerId: string, name: string): void {
  const card = game.getCardForPlayer(playerId);
  if (!card) return;

  const grid = card.getGrid();
  const marked = card.getMarked();

  console.log(`\n  ${name}'s Card:`);
  console.log('  ' + '-'.repeat(71));
  for (let r = 0; r < 5; r++) {
    const cells = grid[r].map((word, c) => {
      const display = word.length > 11 ? word.slice(0, 10) + '…' : word;
      const pad = display.padEnd(12);
      return marked[r][c] ? `[${pad}]` : ` ${pad} `;
    });
    console.log('  ' + cells.join(''));
  }
  console.log('  ' + '-'.repeat(71));
}

function simulateRound(game: BingoGame, roundNum: number): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ROUND ${roundNum}`);
  console.log('='.repeat(60));

  // Generate cards for all players
  for (const p of players) {
    game.generateCardForPlayer(p.id);
  }

  // Show all cards
  for (const p of players) {
    printCard(game, p.id, p.name);
  }

  // Simulate the meeting — words are "heard" in a random order
  const calledWords = [...buzzwords];
  for (let i = calledWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [calledWords[i], calledWords[j]] = [calledWords[j], calledWords[i]];
  }

  console.log('\n  Meeting starts... words are being said:\n');

  for (const word of calledWords) {
    console.log(`  Speaker says: "${word}"`);

    // Each player marks the word
    for (const p of players) {
      const result = game.markWord(p.id, word);

      if (result.success && result.bingo) {
        console.log(`\n  *** BINGO! ${p.name} won with ${formatPattern(result.pattern!)}! ***\n`);

        // Show final card state for the winner
        printCard(game, p.id, p.name);
        return;
      }
    }
  }
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

// ─── Run the demo ─────────────────────────────────────────────────

console.log('\n  Buzzword Bingo - Demo');
console.log('  ' + '='.repeat(40));
console.log(`  Players: ${players.map(p => p.name).join(', ')}`);
console.log(`  Word list: ${buzzwords.length} buzzwords`);

const game = new BingoGame('demo-session', buzzwords);
game.start();

// Play 3 rounds
simulateRound(game, 1);

game.startNewRound();
simulateRound(game, 2);

game.startNewRound();
simulateRound(game, 3);

// Final scoreboard
console.log(`\n${'='.repeat(60)}`);
console.log('  FINAL SCOREBOARD');
console.log('='.repeat(60));

const winners = game.getRoundWinners();
const scores = new Map<string, number>();
for (const p of players) {
  scores.set(p.id, 0);
}
for (const w of winners) {
  scores.set(w.playerId, (scores.get(w.playerId) ?? 0) + w.points);
}

const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
for (let i = 0; i < sorted.length; i++) {
  const [id, pts] = sorted[i];
  const name = players.find(p => p.id === id)!.name;
  const medal = i === 0 ? ' <<< Winner!' : '';
  console.log(`  ${i + 1}. ${name.padEnd(10)} ${String(pts).padStart(4)} pts${medal}`);
}

console.log();
