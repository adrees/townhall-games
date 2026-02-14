import { BingoGame } from '../bingo-game';
import type { MarkResult, Winner, WinPattern } from '../types';

const sampleBuzzwords = [
  "synergy", "circle back", "low-hanging fruit", "move the needle",
  "paradigm shift", "think outside the box", "take this offline",
  "ping me", "deep dive", "touch base", "bandwidth", "leverage",
  "stakeholder", "alignment", "action items", "best practices",
  "core competency", "drill down", "end of day", "game changer",
  "ideate", "key takeaway", "level set", "net-net", "on my radar",
  "quick win", "reach out", "run it up the flagpole", "streamline",
  "value-add",
];

const tooFewWords = sampleBuzzwords.slice(0, 23);

describe('BingoGame', () => {
  // ─── Game Creation ───────────────────────────────────────────────

  describe('Game Creation', () => {
    it('should create a game with a valid word list', () => {
      const game = new BingoGame('session-1', sampleBuzzwords);
      expect(game.sessionId).toBe('session-1');
      expect(game.wordList).toEqual(sampleBuzzwords);
    });

    it('should reject a word list with fewer than 24 unique words', () => {
      expect(() => new BingoGame('session-1', tooFewWords)).toThrow();
    });

    it('should start in waiting status', () => {
      const game = new BingoGame('session-1', sampleBuzzwords);
      expect(game.getStatus()).toBe('waiting');
    });

    it('should start at round 0 before game begins', () => {
      const game = new BingoGame('session-1', sampleBuzzwords);
      expect(game.getCurrentRound()).toBe(0);
    });

    it('should have no winner before game starts', () => {
      const game = new BingoGame('session-1', sampleBuzzwords);
      expect(game.getCurrentWinner()).toBeNull();
    });

    it('should have empty round winners history initially', () => {
      const game = new BingoGame('session-1', sampleBuzzwords);
      expect(game.getRoundWinners()).toEqual([]);
    });
  });

  // ─── Starting the Game ──────────────────────────────────────────

  describe('Starting the Game', () => {
    it('should move to active status when started', () => {
      const game = new BingoGame('session-1', sampleBuzzwords);
      game.start();
      expect(game.getStatus()).toBe('active');
    });

    it('should set round to 1 when started', () => {
      const game = new BingoGame('session-1', sampleBuzzwords);
      game.start();
      expect(game.getCurrentRound()).toBe(1);
    });

    it('should not allow starting an already active game', () => {
      const game = new BingoGame('session-1', sampleBuzzwords);
      game.start();
      expect(() => game.start()).toThrow();
    });
  });

  // ─── Generating Cards for Players ───────────────────────────────

  describe('Generating Cards for Players', () => {
    let game: BingoGame;

    beforeEach(() => {
      game = new BingoGame('session-1', sampleBuzzwords);
      game.start();
    });

    it('should generate a card for a player', () => {
      const card = game.generateCardForPlayer('player-1');
      expect(card).toBeDefined();
      expect(card.playerId).toBe('player-1');
    });

    it('should generate unique cards for different players', () => {
      const card1 = game.generateCardForPlayer('player-1');
      const card2 = game.generateCardForPlayer('player-2');

      expect(card1.id).not.toBe(card2.id);

      const grid1 = card1.getGrid().flat().join(',');
      const grid2 = card2.getGrid().flat().join(',');
      expect(grid1).not.toBe(grid2);
    });

    it('should retrieve a previously generated card for a player', () => {
      const card = game.generateCardForPlayer('player-1');
      const retrieved = game.getCardForPlayer('player-1');
      expect(retrieved).toBe(card);
    });

    it('should return null for a player with no card', () => {
      expect(game.getCardForPlayer('unknown')).toBeNull();
    });

    it('should not generate cards before game starts', () => {
      const freshGame = new BingoGame('session-2', sampleBuzzwords);
      expect(() => freshGame.generateCardForPlayer('player-1')).toThrow();
    });
  });

  // ─── Marking Words – Single Round ───────────────────────────────

  describe('Marking Words - Single Round', () => {
    let game: BingoGame;

    beforeEach(() => {
      game = new BingoGame('session-1', sampleBuzzwords);
      game.start();
      game.generateCardForPlayer('player-1');
      game.generateCardForPlayer('player-2');
    });

    it('should mark a word on a player card and return success', () => {
      const card = game.getCardForPlayer('player-1')!;
      const word = card.getGrid()[0][0];

      const result = game.markWord('player-1', word);
      expect(result.success).toBe(true);
      expect(result.bingo).toBe(false);
      expect(result.roundOver).toBe(false);
    });

    it('should return failure when marking a word not on the card', () => {
      const result = game.markWord('player-1', 'xylophone');
      expect(result.success).toBe(false);
      expect(result.bingo).toBe(false);
    });

    it('should not allow marking words before game starts', () => {
      const freshGame = new BingoGame('session-2', sampleBuzzwords);
      expect(() => freshGame.markWord('player-1', 'synergy')).toThrow();
    });

    it('should not allow marking words for a player without a card', () => {
      const result = game.markWord('unknown-player', 'synergy');
      expect(result.success).toBe(false);
    });
  });

  // ─── Win Detection in Game Context ──────────────────────────────

  describe('Win Detection in Game Context', () => {
    let game: BingoGame;

    beforeEach(() => {
      game = new BingoGame('session-1', sampleBuzzwords);
      game.start();
      game.generateCardForPlayer('player-1');
      game.generateCardForPlayer('player-2');
    });

    it('should detect a win when a player completes a row', () => {
      const card = game.getCardForPlayer('player-1')!;
      const grid = card.getGrid();

      // Mark all of row 0 via game.markWord
      let result: MarkResult = { success: false, bingo: false, roundOver: false };
      for (let c = 0; c < 5; c++) {
        result = game.markWord('player-1', grid[0][c]);
      }

      expect(result.bingo).toBe(true);
      expect(result.roundOver).toBe(true);
      expect(result.pattern).toEqual({ type: 'horizontal', row: 0 });
      expect(result.winnerId).toBe('player-1');
    });

    it('should set game status to finished after a win', () => {
      const card = game.getCardForPlayer('player-1')!;
      const grid = card.getGrid();

      for (let c = 0; c < 5; c++) {
        game.markWord('player-1', grid[0][c]);
      }

      expect(game.getStatus()).toBe('finished');
    });

    it('should record the winner with 100 points', () => {
      const card = game.getCardForPlayer('player-1')!;
      const grid = card.getGrid();

      for (let c = 0; c < 5; c++) {
        game.markWord('player-1', grid[0][c]);
      }

      const winner = game.getCurrentWinner();
      expect(winner).not.toBeNull();
      expect(winner!.playerId).toBe('player-1');
      expect(winner!.points).toBe(100);
      expect(winner!.roundNumber).toBe(1);
      expect(winner!.pattern).toEqual({ type: 'horizontal', row: 0 });
      expect(winner!.timestamp).toBeInstanceOf(Date);
    });

    it('should not allow marking words after round is finished', () => {
      const card1 = game.getCardForPlayer('player-1')!;
      const grid1 = card1.getGrid();

      // Player 1 wins
      for (let c = 0; c < 5; c++) {
        game.markWord('player-1', grid1[0][c]);
      }

      // Player 2 tries to mark after round over
      const card2 = game.getCardForPlayer('player-2')!;
      const word = card2.getGrid()[0][0];
      const result = game.markWord('player-2', word);
      expect(result.success).toBe(false);
      expect(result.roundOver).toBe(true);
    });

    it('should only award win to the first player who completes a pattern', () => {
      const card1 = game.getCardForPlayer('player-1')!;
      const grid1 = card1.getGrid();

      // Player 1 completes row 0
      for (let c = 0; c < 5; c++) {
        game.markWord('player-1', grid1[0][c]);
      }

      expect(game.getCurrentWinner()!.playerId).toBe('player-1');

      // Even if player-2 could theoretically complete, round is over
      expect(game.getStatus()).toBe('finished');
    });
  });

  // ─── Multi-Round Play ───────────────────────────────────────────

  describe('Multi-Round Play', () => {
    let game: BingoGame;

    beforeEach(() => {
      game = new BingoGame('session-1', sampleBuzzwords);
      game.start();
      game.generateCardForPlayer('player-1');
      game.generateCardForPlayer('player-2');
    });

    function winRoundForPlayer(g: BingoGame, playerId: string): void {
      const card = g.getCardForPlayer(playerId)!;
      const grid = card.getGrid();
      // Complete row 0 to win
      for (let c = 0; c < 5; c++) {
        g.markWord(playerId, grid[0][c]);
      }
    }

    it('should allow starting a new round after the current round finishes', () => {
      winRoundForPlayer(game, 'player-1');
      expect(game.getStatus()).toBe('finished');

      game.startNewRound();
      expect(game.getStatus()).toBe('active');
    });

    it('should increment the round number', () => {
      expect(game.getCurrentRound()).toBe(1);
      winRoundForPlayer(game, 'player-1');

      game.startNewRound();
      expect(game.getCurrentRound()).toBe(2);
    });

    it('should generate new cards for all players in the new round', () => {
      const oldCard1 = game.getCardForPlayer('player-1')!;
      const oldGrid1 = oldCard1.getGrid().flat().join(',');

      winRoundForPlayer(game, 'player-1');
      game.startNewRound();

      // Players need new cards for the new round
      game.generateCardForPlayer('player-1');
      game.generateCardForPlayer('player-2');

      const newCard1 = game.getCardForPlayer('player-1')!;
      const newGrid1 = newCard1.getGrid().flat().join(',');

      // New card should be different (statistically)
      expect(newCard1.id).not.toBe(oldCard1.id);
      expect(newGrid1).not.toBe(oldGrid1);
    });

    it('should clear the current winner for the new round', () => {
      winRoundForPlayer(game, 'player-1');
      expect(game.getCurrentWinner()).not.toBeNull();

      game.startNewRound();
      expect(game.getCurrentWinner()).toBeNull();
    });

    it('should preserve the previous winner in round history', () => {
      winRoundForPlayer(game, 'player-1');
      game.startNewRound();

      const history = game.getRoundWinners();
      expect(history).toHaveLength(1);
      expect(history[0].playerId).toBe('player-1');
      expect(history[0].roundNumber).toBe(1);
      expect(history[0].points).toBe(100);
    });

    it('should not allow starting a new round while current round is active', () => {
      expect(game.getStatus()).toBe('active');
      expect(() => game.startNewRound()).toThrow();
    });

    it('should track multiple round winners in history', () => {
      // Round 1: player-1 wins
      winRoundForPlayer(game, 'player-1');
      game.startNewRound();
      game.generateCardForPlayer('player-1');
      game.generateCardForPlayer('player-2');

      // Round 2: player-2 wins
      winRoundForPlayer(game, 'player-2');

      const history = game.getRoundWinners();
      expect(history).toHaveLength(2);
      expect(history[0].playerId).toBe('player-1');
      expect(history[0].roundNumber).toBe(1);
      expect(history[1].playerId).toBe('player-2');
      expect(history[1].roundNumber).toBe(2);
    });
  });

  // ─── Scoring ────────────────────────────────────────────────────

  describe('Scoring', () => {
    let game: BingoGame;

    beforeEach(() => {
      game = new BingoGame('session-1', sampleBuzzwords);
      game.start();
      game.generateCardForPlayer('player-1');
      game.generateCardForPlayer('player-2');
    });

    function winRoundForPlayer(g: BingoGame, playerId: string): void {
      const card = g.getCardForPlayer(playerId)!;
      const grid = card.getGrid();
      for (let c = 0; c < 5; c++) {
        g.markWord(playerId, grid[0][c]);
      }
    }

    it('should award 100 points to the round winner', () => {
      winRoundForPlayer(game, 'player-1');

      const winner = game.getCurrentWinner()!;
      expect(winner.points).toBe(100);
    });

    it('should accumulate points across multiple rounds for the same winner', () => {
      // Round 1
      winRoundForPlayer(game, 'player-1');
      game.startNewRound();
      game.generateCardForPlayer('player-1');
      game.generateCardForPlayer('player-2');

      // Round 2: same player wins
      winRoundForPlayer(game, 'player-1');

      const history = game.getRoundWinners();
      const player1Wins = history.filter(w => w.playerId === 'player-1');
      const totalPoints = player1Wins.reduce((sum, w) => sum + w.points, 0);
      expect(totalPoints).toBe(200);
    });

    it('should track points separately for different winners', () => {
      // Round 1: player-1 wins
      winRoundForPlayer(game, 'player-1');
      game.startNewRound();
      game.generateCardForPlayer('player-1');
      game.generateCardForPlayer('player-2');

      // Round 2: player-2 wins
      winRoundForPlayer(game, 'player-2');

      const history = game.getRoundWinners();
      const p1Points = history
        .filter(w => w.playerId === 'player-1')
        .reduce((sum, w) => sum + w.points, 0);
      const p2Points = history
        .filter(w => w.playerId === 'player-2')
        .reduce((sum, w) => sum + w.points, 0);

      expect(p1Points).toBe(100);
      expect(p2Points).toBe(100);
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle word list with duplicates (deduplicates before validation)', () => {
      // 30 words + 6 duplicates = still 30 unique, which is >= 24
      const withDupes = [...sampleBuzzwords, ...sampleBuzzwords.slice(0, 6)];
      const game = new BingoGame('session-1', withDupes);
      expect(game).toBeDefined();
    });

    it('should reject a word list that falls below 24 after dedup and filtering', () => {
      const shortAfterCleanup = [
        '', '  ',
        ...sampleBuzzwords.slice(0, 23),
        ...sampleBuzzwords.slice(0, 5), // duplicates
        '', '',
      ];
      expect(() => new BingoGame('session-1', shortAfterCleanup)).toThrow();
    });

    it('should handle a player joining mid-round (gets card for current round)', () => {
      const game = new BingoGame('session-1', sampleBuzzwords);
      game.start();
      game.generateCardForPlayer('player-1');

      // Player 2 joins later
      const card = game.generateCardForPlayer('player-2');
      expect(card).toBeDefined();
      expect(card.playerId).toBe('player-2');
    });

    it('should handle starting a new round immediately after finishing', () => {
      const game = new BingoGame('session-1', sampleBuzzwords);
      game.start();
      game.generateCardForPlayer('player-1');

      // Win round 1
      const card = game.getCardForPlayer('player-1')!;
      const grid = card.getGrid();
      for (let c = 0; c < 5; c++) {
        game.markWord('player-1', grid[0][c]);
      }

      // Immediately start next round
      game.startNewRound();
      expect(game.getStatus()).toBe('active');
      expect(game.getCurrentRound()).toBe(2);
    });

    it('should win via row 2 with only 4 word marks (FREE pre-marked)', () => {
      const game = new BingoGame('session-1', sampleBuzzwords);
      game.start();
      game.generateCardForPlayer('player-1');

      const card = game.getCardForPlayer('player-1')!;
      const grid = card.getGrid();

      // Mark row 2 positions except FREE center [2,2]
      let result: MarkResult = { success: false, bingo: false, roundOver: false };
      for (let c = 0; c < 5; c++) {
        if (c === 2) continue; // skip FREE
        result = game.markWord('player-1', grid[2][c]);
      }

      expect(result.bingo).toBe(true);
      expect(result.pattern).toEqual({ type: 'horizontal', row: 2 });
    });

    it('should support 3 consecutive rounds with different winners', () => {
      const game = new BingoGame('session-1', sampleBuzzwords);
      game.start();

      const players = ['player-1', 'player-2', 'player-3'];

      for (let round = 0; round < 3; round++) {
        for (const p of players) {
          game.generateCardForPlayer(p);
        }

        const winnerId = players[round];
        const card = game.getCardForPlayer(winnerId)!;
        const grid = card.getGrid();
        for (let c = 0; c < 5; c++) {
          game.markWord(winnerId, grid[0][c]);
        }

        if (round < 2) {
          game.startNewRound();
        }
      }

      const history = game.getRoundWinners();
      expect(history).toHaveLength(3);
      expect(history[0].playerId).toBe('player-1');
      expect(history[1].playerId).toBe('player-2');
      expect(history[2].playerId).toBe('player-3');
      expect(game.getCurrentWinner()!.playerId).toBe('player-3');
    });

    it('should include winnerName in MarkResult when win is detected', () => {
      const game = new BingoGame('session-1', sampleBuzzwords);
      game.start();
      game.generateCardForPlayer('player-1');

      const card = game.getCardForPlayer('player-1')!;
      const grid = card.getGrid();

      let result: MarkResult = { success: false, bingo: false, roundOver: false };
      for (let c = 0; c < 5; c++) {
        result = game.markWord('player-1', grid[0][c]);
      }

      expect(result.winnerId).toBe('player-1');
      // winnerName should be defined (could be same as playerId if no screen name set)
      expect(result.winnerName).toBeDefined();
    });
  });
});
