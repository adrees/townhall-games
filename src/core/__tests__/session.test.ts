import { Session } from '../session';
import type { GameEvent, PlayerWonEvent, GameStartedEvent, NewRoundStartedEvent, EventListener } from '../types';

const sampleBuzzwords = [
  'synergy', 'circle back', 'low-hanging fruit', 'move the needle',
  'paradigm shift', 'think outside the box', 'take this offline',
  'ping me', 'deep dive', 'touch base', 'bandwidth', 'leverage',
  'stakeholder', 'alignment', 'action items', 'best practices',
  'core competency', 'drill down', 'end of day', 'game changer',
  'ideate', 'key takeaway', 'level set', 'net-net', 'on my radar',
  'quick win', 'reach out', 'run it up the flagpole', 'streamline',
  'value-add',
];

/** Helper: mark all words in a row on a player's card to force a win */
function markRowForWin(session: Session, playerId: string, row: number): void {
  const card = session.getCardForPlayer(playerId)!;
  const grid = card.getGrid();
  for (let c = 0; c < 5; c++) {
    if (grid[row][c] !== 'FREE') {
      session.markWord(playerId, grid[row][c]);
    }
  }
}

describe('Session', () => {
  // ── Session Creation ──────────────────────────────────────────────

  describe('Session Creation', () => {
    it('creates a session with a valid word list', () => {
      const session = new Session(sampleBuzzwords);
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(typeof session.id).toBe('string');
    });

    it('rejects a word list with fewer than 24 unique words', () => {
      expect(() => new Session(sampleBuzzwords.slice(0, 10))).toThrow(/24/);
    });

    it('generates a unique session ID', () => {
      const s1 = new Session(sampleBuzzwords);
      const s2 = new Session(sampleBuzzwords);
      expect(s1.id).not.toBe(s2.id);
    });

    it('starts with no players', () => {
      const session = new Session(sampleBuzzwords);
      expect(session.getPlayers()).toEqual([]);
    });

    it('starts with no game (status is no_game)', () => {
      const session = new Session(sampleBuzzwords);
      expect(session.getGameStatus()).toBe('no_game');
    });
  });

  // ── Player Management ─────────────────────────────────────────────

  describe('Player Management', () => {
    let session: Session;

    beforeEach(() => {
      session = new Session(sampleBuzzwords);
    });

    it('adds a player and returns Player object', () => {
      const player = session.addPlayer('Alice');
      expect(player.id).toBeDefined();
      expect(player.screenName).toBe('Alice');
      expect(player.joinedAt).toBeInstanceOf(Date);
    });

    it('adds multiple players', () => {
      session.addPlayer('Alice');
      session.addPlayer('Bob');
      expect(session.getPlayers()).toHaveLength(2);
    });

    it('rejects duplicate screen names (case-insensitive)', () => {
      session.addPlayer('Alice');
      expect(() => session.addPlayer('alice')).toThrow(/screen name/i);
      expect(() => session.addPlayer('ALICE')).toThrow(/screen name/i);
    });

    it('rejects blank screen names', () => {
      expect(() => session.addPlayer('')).toThrow();
      expect(() => session.addPlayer('   ')).toThrow();
    });

    it('gets a player by ID', () => {
      const player = session.addPlayer('Alice');
      expect(session.getPlayer(player.id)).toEqual(player);
    });

    it('returns null for unknown player ID', () => {
      expect(session.getPlayer('nonexistent')).toBeNull();
    });

    it('removes a player', () => {
      const player = session.addPlayer('Alice');
      session.removePlayer(player.id);
      expect(session.getPlayers()).toHaveLength(0);
      expect(session.getPlayer(player.id)).toBeNull();
    });

    it('allows reusing a screen name after removal', () => {
      const player = session.addPlayer('Alice');
      session.removePlayer(player.id);
      const newPlayer = session.addPlayer('Alice');
      expect(newPlayer.screenName).toBe('Alice');
    });
  });

  // ── Starting the Game ─────────────────────────────────────────────

  describe('Starting the Game', () => {
    let session: Session;

    beforeEach(() => {
      session = new Session(sampleBuzzwords);
    });

    it('starts a game and sets status to active', () => {
      session.addPlayer('Alice');
      session.startGame();
      expect(session.getGameStatus()).toBe('active');
    });

    it('sets round number to 1', () => {
      session.addPlayer('Alice');
      session.startGame();
      expect(session.getCurrentRound()).toBe(1);
    });

    it('auto-generates cards for all players', () => {
      const alice = session.addPlayer('Alice');
      const bob = session.addPlayer('Bob');
      session.startGame();
      expect(session.getCardForPlayer(alice.id)).not.toBeNull();
      expect(session.getCardForPlayer(bob.id)).not.toBeNull();
    });

    it('emits game_started event per player', () => {
      const events: GameEvent[] = [];
      session.addEventListener((e) => events.push(e));
      const alice = session.addPlayer('Alice');
      const bob = session.addPlayer('Bob');
      session.startGame();

      const startEvents = events.filter((e) => e.type === 'game_started') as GameStartedEvent[];
      expect(startEvents).toHaveLength(2);
      expect(startEvents.map((e) => e.playerId).sort()).toEqual(
        [alice.id, bob.id].sort()
      );
      expect(startEvents[0].roundNumber).toBe(1);
      expect(startEvents[0].playerCard).toBeDefined();
    });

    it('requires at least 1 player to start', () => {
      expect(() => session.startGame()).toThrow(/player/i);
    });
  });

  // ── Event System ──────────────────────────────────────────────────

  describe('Event System', () => {
    let session: Session;

    beforeEach(() => {
      session = new Session(sampleBuzzwords);
    });

    it('adds a listener and receives events', () => {
      const events: GameEvent[] = [];
      session.addEventListener((e) => events.push(e));
      session.addPlayer('Alice');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('player_joined');
    });

    it('supports multiple listeners', () => {
      const events1: GameEvent[] = [];
      const events2: GameEvent[] = [];
      session.addEventListener((e) => events1.push(e));
      session.addEventListener((e) => events2.push(e));
      session.addPlayer('Alice');
      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
    });

    it('removes a listener', () => {
      const events: GameEvent[] = [];
      const listener: EventListener = (e) => events.push(e);
      session.addEventListener(listener);
      session.removeEventListener(listener);
      session.addPlayer('Alice');
      expect(events).toHaveLength(0);
    });

    it('removed listener does not receive events', () => {
      const events1: GameEvent[] = [];
      const events2: GameEvent[] = [];
      const listener1: EventListener = (e) => events1.push(e);
      const listener2: EventListener = (e) => events2.push(e);
      session.addEventListener(listener1);
      session.addEventListener(listener2);
      session.removeEventListener(listener1);
      session.addPlayer('Alice');
      expect(events1).toHaveLength(0);
      expect(events2).toHaveLength(1);
    });

    it('listener error does not crash event emission', () => {
      const events: GameEvent[] = [];
      session.addEventListener(() => {
        throw new Error('listener crash');
      });
      session.addEventListener((e) => events.push(e));
      session.addPlayer('Alice');
      expect(events).toHaveLength(1);
    });
  });

  // ── Marking Words & Winning ───────────────────────────────────────

  describe('Marking Words & Winning', () => {
    let session: Session;

    beforeEach(() => {
      session = new Session(sampleBuzzwords);
    });

    it('delegates markWord to the game', () => {
      const alice = session.addPlayer('Alice');
      session.startGame();
      const card = session.getCardForPlayer(alice.id)!;
      const word = card.getGrid()[0][0];
      const result = session.markWord(alice.id, word);
      expect(result.success).toBe(true);
    });

    it('returns unsuccessful for word not on card', () => {
      const alice = session.addPlayer('Alice');
      session.startGame();
      const result = session.markWord(alice.id, 'xyznonexistent');
      expect(result.success).toBe(false);
    });

    it('detects a win and sets status to finished', () => {
      const alice = session.addPlayer('Alice');
      session.startGame();
      markRowForWin(session, alice.id, 0);
      expect(session.getGameStatus()).toBe('finished');
    });

    it('emits player_won event with screen name', () => {
      const events: GameEvent[] = [];
      session.addEventListener((e) => events.push(e));
      const alice = session.addPlayer('Alice');
      session.startGame();
      markRowForWin(session, alice.id, 0);

      const wonEvents = events.filter((e) => e.type === 'player_won') as PlayerWonEvent[];
      expect(wonEvents).toHaveLength(1);
      expect(wonEvents[0].winnerId).toBe(alice.id);
      expect(wonEvents[0].winnerName).toBe('Alice');
      expect(wonEvents[0].pattern).toBeDefined();
      expect(wonEvents[0].roundNumber).toBe(1);
    });

    it('enriches MarkResult winnerName with screen name', () => {
      const alice = session.addPlayer('Alice');
      session.startGame();
      const card = session.getCardForPlayer(alice.id)!;
      const grid = card.getGrid();
      // Mark row 0 to win
      let lastResult;
      for (let c = 0; c < 5; c++) {
        if (grid[0][c] !== 'FREE') {
          lastResult = session.markWord(alice.id, grid[0][c]);
        }
      }
      expect(lastResult!.bingo).toBe(true);
      expect(lastResult!.winnerName).toBe('Alice');
    });

    it('rejects marks after round ends', () => {
      const alice = session.addPlayer('Alice');
      const bob = session.addPlayer('Bob');
      session.startGame();
      markRowForWin(session, alice.id, 0);
      const card = session.getCardForPlayer(bob.id)!;
      const word = card.getGrid()[0][0];
      const result = session.markWord(bob.id, word);
      expect(result.success).toBe(false);
      expect(result.roundOver).toBe(true);
    });

    it('throws if no game is active', () => {
      const alice = session.addPlayer('Alice');
      expect(() => session.markWord(alice.id, 'synergy')).toThrow(/game/i);
    });
  });

  // ── Leaderboard & Scoring ─────────────────────────────────────────

  describe('Leaderboard & Scoring', () => {
    let session: Session;

    beforeEach(() => {
      session = new Session(sampleBuzzwords);
    });

    it('returns empty leaderboard with no players', () => {
      expect(session.getLeaderboard()).toEqual([]);
    });

    it('includes all players with 0 points before any wins', () => {
      session.addPlayer('Alice');
      session.addPlayer('Bob');
      const board = session.getLeaderboard();
      expect(board).toHaveLength(2);
      expect(board.every((p) => p.totalPoints === 0)).toBe(true);
    });

    it('awards 100 points to the winner', () => {
      const alice = session.addPlayer('Alice');
      session.addPlayer('Bob');
      session.startGame();
      markRowForWin(session, alice.id, 0);
      const board = session.getLeaderboard();
      const aliceScore = board.find((p) => p.playerId === alice.id)!;
      expect(aliceScore.totalPoints).toBe(100);
      expect(aliceScore.roundsWon).toBe(1);
    });

    it('non-winner has 0 points', () => {
      const alice = session.addPlayer('Alice');
      const bob = session.addPlayer('Bob');
      session.startGame();
      markRowForWin(session, alice.id, 0);
      const board = session.getLeaderboard();
      const bobScore = board.find((p) => p.playerId === bob.id)!;
      expect(bobScore.totalPoints).toBe(0);
      expect(bobScore.roundsWon).toBe(0);
    });

    it('accumulates scores across rounds', () => {
      const alice = session.addPlayer('Alice');
      session.addPlayer('Bob');
      session.startGame();
      markRowForWin(session, alice.id, 0);
      session.startNewRound();
      markRowForWin(session, alice.id, 0);
      const board = session.getLeaderboard();
      const aliceScore = board.find((p) => p.playerId === alice.id)!;
      expect(aliceScore.totalPoints).toBe(200);
      expect(aliceScore.roundsWon).toBe(2);
    });

    it('sorts leaderboard by totalPoints descending', () => {
      const alice = session.addPlayer('Alice');
      const bob = session.addPlayer('Bob');
      session.startGame();
      markRowForWin(session, alice.id, 0);
      session.startNewRound();
      markRowForWin(session, alice.id, 0);
      const board = session.getLeaderboard();
      expect(board[0].playerId).toBe(alice.id);
      expect(board[0].totalPoints).toBeGreaterThanOrEqual(board[1].totalPoints);
    });

    it('includes 0-point players in leaderboard', () => {
      const alice = session.addPlayer('Alice');
      const bob = session.addPlayer('Bob');
      const carol = session.addPlayer('Carol');
      session.startGame();
      markRowForWin(session, alice.id, 0);
      const board = session.getLeaderboard();
      expect(board).toHaveLength(3);
      expect(board.find((p) => p.playerId === bob.id)!.totalPoints).toBe(0);
      expect(board.find((p) => p.playerId === carol.id)!.totalPoints).toBe(0);
    });

    it('tracks lastWinRound', () => {
      const alice = session.addPlayer('Alice');
      session.addPlayer('Bob');
      session.startGame();
      markRowForWin(session, alice.id, 0);
      session.startNewRound();
      markRowForWin(session, alice.id, 0);
      const board = session.getLeaderboard();
      const aliceScore = board.find((p) => p.playerId === alice.id)!;
      expect(aliceScore.lastWinRound).toBe(2);
    });
  });

  // ── Multi-Round Play ──────────────────────────────────────────────

  describe('Multi-Round Play', () => {
    let session: Session;

    beforeEach(() => {
      session = new Session(sampleBuzzwords);
    });

    it('starts a new round after previous round finishes', () => {
      const alice = session.addPlayer('Alice');
      session.startGame();
      markRowForWin(session, alice.id, 0);
      expect(session.getGameStatus()).toBe('finished');
      session.startNewRound();
      expect(session.getGameStatus()).toBe('active');
    });

    it('increments round number', () => {
      const alice = session.addPlayer('Alice');
      session.startGame();
      expect(session.getCurrentRound()).toBe(1);
      markRowForWin(session, alice.id, 0);
      session.startNewRound();
      expect(session.getCurrentRound()).toBe(2);
    });

    it('generates new cards for all players', () => {
      const alice = session.addPlayer('Alice');
      const bob = session.addPlayer('Bob');
      session.startGame();
      const oldCardAlice = session.getCardForPlayer(alice.id)!;
      markRowForWin(session, alice.id, 0);
      session.startNewRound();
      const newCardAlice = session.getCardForPlayer(alice.id)!;
      expect(newCardAlice.id).not.toBe(oldCardAlice.id);
      expect(session.getCardForPlayer(bob.id)).not.toBeNull();
    });

    it('emits new_round_started event per player', () => {
      const events: GameEvent[] = [];
      session.addEventListener((e) => events.push(e));
      const alice = session.addPlayer('Alice');
      const bob = session.addPlayer('Bob');
      session.startGame();
      markRowForWin(session, alice.id, 0);
      events.length = 0; // clear
      session.startNewRound();

      const roundEvents = events.filter(
        (e) => e.type === 'new_round_started'
      ) as NewRoundStartedEvent[];
      expect(roundEvents).toHaveLength(2);
      expect(roundEvents[0].roundNumber).toBe(2);
      expect(roundEvents[0].playerCard).toBeDefined();
    });

    it('scores accumulate across rounds', () => {
      const alice = session.addPlayer('Alice');
      const bob = session.addPlayer('Bob');
      session.startGame();
      markRowForWin(session, alice.id, 0);
      session.startNewRound();
      markRowForWin(session, bob.id, 0);
      const board = session.getLeaderboard();
      expect(board.find((p) => p.playerId === alice.id)!.totalPoints).toBe(100);
      expect(board.find((p) => p.playerId === bob.id)!.totalPoints).toBe(100);
    });

    it('cannot start new round while game is active', () => {
      session.addPlayer('Alice');
      session.startGame();
      expect(() => session.startNewRound()).toThrow();
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    let session: Session;

    beforeEach(() => {
      session = new Session(sampleBuzzwords);
    });

    it('late joiner gets a card when game is active', () => {
      session.addPlayer('Alice');
      session.startGame();
      const bob = session.addPlayer('Bob');
      expect(session.getCardForPlayer(bob.id)).not.toBeNull();
    });

    it('late joiner receives game_started event', () => {
      session.addPlayer('Alice');
      session.startGame();
      const events: GameEvent[] = [];
      session.addEventListener((e) => events.push(e));
      const bob = session.addPlayer('Bob');
      const startEvents = events.filter((e) => e.type === 'game_started') as GameStartedEvent[];
      expect(startEvents).toHaveLength(1);
      expect(startEvents[0].playerId).toBe(bob.id);
    });

    it('player leaves mid-game without crashing', () => {
      const alice = session.addPlayer('Alice');
      const bob = session.addPlayer('Bob');
      session.startGame();
      session.removePlayer(alice.id);
      // Bob can still play
      const card = session.getCardForPlayer(bob.id)!;
      const word = card.getGrid()[0][0];
      const result = session.markWord(bob.id, word);
      expect(result.success).toBe(true);
    });

    it('emits player_left when player is removed', () => {
      const events: GameEvent[] = [];
      session.addEventListener((e) => events.push(e));
      const alice = session.addPlayer('Alice');
      session.removePlayer(alice.id);
      const leftEvents = events.filter((e) => e.type === 'player_left');
      expect(leftEvents).toHaveLength(1);
      expect(leftEvents[0]).toMatchObject({
        type: 'player_left',
        playerId: alice.id,
        screenName: 'Alice',
      });
    });

    it('handles 50 players', () => {
      for (let i = 0; i < 50; i++) {
        session.addPlayer(`Player${i}`);
      }
      session.startGame();
      expect(session.getPlayers()).toHaveLength(50);
      const players = session.getPlayers();
      for (const p of players) {
        expect(session.getCardForPlayer(p.id)).not.toBeNull();
      }
    });

    it('getCurrentWinner returns winner info with screen name', () => {
      const alice = session.addPlayer('Alice');
      session.startGame();
      expect(session.getCurrentWinner()).toBeNull();
      markRowForWin(session, alice.id, 0);
      const winner = session.getCurrentWinner();
      expect(winner).not.toBeNull();
      expect(winner!.playerId).toBe(alice.id);
      expect(winner!.screenName).toBe('Alice');
      expect(winner!.pattern).toBeDefined();
      expect(winner!.roundNumber).toBe(1);
    });
  });
});
