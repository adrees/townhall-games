import { BingoCard } from '../bingo-card';
import type { WinPattern } from '../types';

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

// Exactly 24 words — the minimum needed to fill a card
const minimal24Words = sampleBuzzwords.slice(0, 24);

// Fewer than 24 — should be rejected
const tooFewWords = sampleBuzzwords.slice(0, 23);

describe('BingoCard', () => {
  // ─── Card Generation ──────────────────────────────────────────────

  describe('Card Generation', () => {
    it('should generate a 5x5 grid with 24 unique words + FREE center', () => {
      const card = BingoCard.generate('player-1', sampleBuzzwords);
      const grid = card.getGrid();

      expect(grid).toHaveLength(5);
      grid.forEach((row) => expect(row).toHaveLength(5));

      // Collect all non-FREE words
      const words: string[] = [];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (r === 2 && c === 2) continue;
          words.push(grid[r][c]);
        }
      }
      expect(words).toHaveLength(24);
      expect(new Set(words).size).toBe(24);
    });

    it('should place FREE at center position [2,2]', () => {
      const card = BingoCard.generate('player-1', sampleBuzzwords);
      expect(card.getGrid()[2][2]).toBe('FREE');
    });

    it('should pre-mark the FREE space', () => {
      const card = BingoCard.generate('player-1', sampleBuzzwords);
      expect(card.getMarked()[2][2]).toBe(true);
    });

    it('should only use words from the provided word list', () => {
      const card = BingoCard.generate('player-1', sampleBuzzwords);
      const grid = card.getGrid();

      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (r === 2 && c === 2) continue; // skip FREE
          expect(sampleBuzzwords).toContain(grid[r][c]);
        }
      }
    });

    it('should not have duplicate words on the same card', () => {
      const card = BingoCard.generate('player-1', sampleBuzzwords);
      const grid = card.getGrid();
      const words: string[] = [];

      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (r === 2 && c === 2) continue;
          words.push(grid[r][c]);
        }
      }

      expect(new Set(words).size).toBe(words.length);
    });

    it('should reject a word list with fewer than 24 words', () => {
      expect(() => BingoCard.generate('player-1', tooFewWords)).toThrow();
    });

    it('should handle a word list with exactly 24 words', () => {
      const card = BingoCard.generate('player-1', minimal24Words);
      const grid = card.getGrid();

      const words: string[] = [];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (r === 2 && c === 2) continue;
          words.push(grid[r][c]);
        }
      }

      // With exactly 24 words, every word must appear on the card
      expect(new Set(words)).toEqual(new Set(minimal24Words));
    });

    it('should generate statistically different cards for different players', () => {
      const card1 = BingoCard.generate('player-1', sampleBuzzwords);
      const card2 = BingoCard.generate('player-2', sampleBuzzwords);

      const grid1 = card1.getGrid().flat().join(',');
      const grid2 = card2.getGrid().flat().join(',');

      // Extremely unlikely (but not impossible) for two random cards to be identical
      expect(grid1).not.toBe(grid2);
    });

    it('should assign a unique card ID', () => {
      const card1 = BingoCard.generate('player-1', sampleBuzzwords);
      const card2 = BingoCard.generate('player-2', sampleBuzzwords);

      expect(card1.id).toBeDefined();
      expect(card2.id).toBeDefined();
      expect(card1.id).not.toBe(card2.id);
    });

    it('should store the correct playerId', () => {
      const card = BingoCard.generate('player-42', sampleBuzzwords);
      expect(card.playerId).toBe('player-42');
    });
  });

  // ─── Marking Squares ──────────────────────────────────────────────

  describe('Marking Squares', () => {
    let card: BingoCard;

    beforeEach(() => {
      card = BingoCard.generate('player-1', sampleBuzzwords);
    });

    it('should mark a word that exists on the card and return true', () => {
      // Pick the first non-FREE word from the grid
      const word = card.getGrid()[0][0];
      expect(card.markWord(word)).toBe(true);
      expect(card.getMarked()[0][0]).toBe(true);
    });

    it('should return false when marking a word not on the card', () => {
      expect(card.markWord('xylophone')).toBe(false);
    });

    it('should mark a square by position [row, col]', () => {
      expect(card.markPosition(0, 0)).toBe(true);
      expect(card.getMarked()[0][0]).toBe(true);
    });

    it('should reject marking out-of-bounds positions', () => {
      expect(card.markPosition(-1, 0)).toBe(false);
      expect(card.markPosition(0, -1)).toBe(false);
      expect(card.markPosition(5, 0)).toBe(false);
      expect(card.markPosition(0, 5)).toBe(false);
      expect(card.markPosition(5, 5)).toBe(false);
    });

    it('should not allow unmarking a marked square (marked state is permanent)', () => {
      card.markPosition(0, 0);
      expect(card.getMarked()[0][0]).toBe(true);

      // The class does not expose an unmark method — verify the square stays marked
      // after various operations
      card.markPosition(1, 1);
      expect(card.getMarked()[0][0]).toBe(true);
    });

    it('should be idempotent when marking the same square twice', () => {
      const word = card.getGrid()[0][0];

      const firstMark = card.markWord(word);
      const secondMark = card.markWord(word);

      // Both calls succeed (word exists), square stays marked
      expect(firstMark).toBe(true);
      expect(secondMark).toBe(true);
      expect(card.getMarked()[0][0]).toBe(true);
    });

    it('should match words case-insensitively', () => {
      const word = card.getGrid()[0][0]; // e.g. "synergy"
      const upperWord = word.toUpperCase();

      expect(card.markWord(upperWord)).toBe(true);
      expect(card.getMarked()[0][0]).toBe(true);
    });

    it('should trim whitespace from words when marking', () => {
      const word = card.getGrid()[0][0];
      expect(card.markWord(`  ${word}  `)).toBe(true);
      expect(card.getMarked()[0][0]).toBe(true);
    });
  });

  // ─── Win Detection – Horizontal ───────────────────────────────────

  describe('Win Detection - Horizontal', () => {
    let card: BingoCard;

    beforeEach(() => {
      card = BingoCard.generate('player-1', sampleBuzzwords);
    });

    it('should detect win when row 0 is complete', () => {
      for (let c = 0; c < 5; c++) card.markPosition(0, c);
      expect(card.hasWon()).toBe(true);

      const pattern = card.getWinningPattern();
      expect(pattern).toEqual({ type: 'horizontal', row: 0 });
    });

    it('should detect win when row 1 is complete', () => {
      for (let c = 0; c < 5; c++) card.markPosition(1, c);
      expect(card.hasWon()).toBe(true);

      const pattern = card.getWinningPattern();
      expect(pattern).toEqual({ type: 'horizontal', row: 1 });
    });

    it('should detect win when row 2 is complete (includes FREE)', () => {
      for (let c = 0; c < 5; c++) card.markPosition(2, c);
      expect(card.hasWon()).toBe(true);

      const pattern = card.getWinningPattern();
      expect(pattern).toEqual({ type: 'horizontal', row: 2 });
    });

    it('should detect win when row 3 is complete', () => {
      for (let c = 0; c < 5; c++) card.markPosition(3, c);
      expect(card.hasWon()).toBe(true);

      const pattern = card.getWinningPattern();
      expect(pattern).toEqual({ type: 'horizontal', row: 3 });
    });

    it('should detect win when row 4 is complete', () => {
      for (let c = 0; c < 5; c++) card.markPosition(4, c);
      expect(card.hasWon()).toBe(true);

      const pattern = card.getWinningPattern();
      expect(pattern).toEqual({ type: 'horizontal', row: 4 });
    });

    it('should NOT detect a win with only 4/5 marked in a row', () => {
      // Mark 4 out of 5 in row 0
      for (let c = 0; c < 4; c++) card.markPosition(0, c);
      expect(card.hasWon()).toBe(false);
      expect(card.getWinningPattern()).toBeNull();
    });
  });

  // ─── Win Detection – Vertical ─────────────────────────────────────

  describe('Win Detection - Vertical', () => {
    let card: BingoCard;

    beforeEach(() => {
      card = BingoCard.generate('player-1', sampleBuzzwords);
    });

    it('should detect win when column 0 is complete', () => {
      for (let r = 0; r < 5; r++) card.markPosition(r, 0);
      expect(card.hasWon()).toBe(true);

      const pattern = card.getWinningPattern();
      expect(pattern).toEqual({ type: 'vertical', col: 0 });
    });

    it('should detect win when column 1 is complete', () => {
      for (let r = 0; r < 5; r++) card.markPosition(r, 1);
      expect(card.hasWon()).toBe(true);

      const pattern = card.getWinningPattern();
      expect(pattern).toEqual({ type: 'vertical', col: 1 });
    });

    it('should detect win when column 2 is complete (includes FREE)', () => {
      for (let r = 0; r < 5; r++) card.markPosition(r, 2);
      expect(card.hasWon()).toBe(true);

      const pattern = card.getWinningPattern();
      expect(pattern).toEqual({ type: 'vertical', col: 2 });
    });

    it('should detect win when column 3 is complete', () => {
      for (let r = 0; r < 5; r++) card.markPosition(r, 3);
      expect(card.hasWon()).toBe(true);

      const pattern = card.getWinningPattern();
      expect(pattern).toEqual({ type: 'vertical', col: 3 });
    });

    it('should detect win when column 4 is complete', () => {
      for (let r = 0; r < 5; r++) card.markPosition(r, 4);
      expect(card.hasWon()).toBe(true);

      const pattern = card.getWinningPattern();
      expect(pattern).toEqual({ type: 'vertical', col: 4 });
    });

    it('should NOT detect a win with only 4/5 marked in a column', () => {
      for (let r = 0; r < 4; r++) card.markPosition(r, 0);
      expect(card.hasWon()).toBe(false);
      expect(card.getWinningPattern()).toBeNull();
    });
  });

  // ─── Win Detection – Diagonals ────────────────────────────────────

  describe('Win Detection - Diagonals', () => {
    let card: BingoCard;

    beforeEach(() => {
      card = BingoCard.generate('player-1', sampleBuzzwords);
    });

    it('should detect win on top-left to bottom-right diagonal', () => {
      // [0,0], [1,1], [2,2](FREE), [3,3], [4,4]
      card.markPosition(0, 0);
      card.markPosition(1, 1);
      // [2,2] is already marked (FREE)
      card.markPosition(3, 3);
      card.markPosition(4, 4);

      expect(card.hasWon()).toBe(true);

      const pattern = card.getWinningPattern();
      expect(pattern).toEqual({ type: 'diagonal', direction: 'tl-br' });
    });

    it('should detect win on top-right to bottom-left diagonal', () => {
      // [0,4], [1,3], [2,2](FREE), [3,1], [4,0]
      card.markPosition(0, 4);
      card.markPosition(1, 3);
      // [2,2] is already marked (FREE)
      card.markPosition(3, 1);
      card.markPosition(4, 0);

      expect(card.hasWon()).toBe(true);

      const pattern = card.getWinningPattern();
      expect(pattern).toEqual({ type: 'diagonal', direction: 'tr-bl' });
    });

    it('should NOT detect a win with only 4/5 marked in a diagonal', () => {
      // Mark 3 out of 4 needed (+ FREE = 4 total, need 5)
      card.markPosition(0, 0);
      card.markPosition(1, 1);
      // [2,2] FREE is marked
      card.markPosition(3, 3);
      // Missing [4,4]

      expect(card.hasWon()).toBe(false);
      expect(card.getWinningPattern()).toBeNull();
    });
  });

  // ─── Win Detection – Four Corners ─────────────────────────────────

  describe('Win Detection - Four Corners', () => {
    let card: BingoCard;

    beforeEach(() => {
      card = BingoCard.generate('player-1', sampleBuzzwords);
    });

    it('should detect win when all 4 corners + center are marked', () => {
      // Corners: [0,0], [0,4], [4,0], [4,4]; Center [2,2] is FREE
      card.markPosition(0, 0);
      card.markPosition(0, 4);
      card.markPosition(4, 0);
      card.markPosition(4, 4);

      expect(card.hasWon()).toBe(true);

      const pattern = card.getWinningPattern();
      expect(pattern).toEqual({ type: 'corners' });
    });

    it('should NOT detect a win with only 3/4 corners + center', () => {
      card.markPosition(0, 0);
      card.markPosition(0, 4);
      card.markPosition(4, 0);
      // Missing [4,4]

      expect(card.hasWon()).toBe(false);
      expect(card.getWinningPattern()).toBeNull();
    });
  });

  // ─── Win Detection – Multiple Patterns ────────────────────────────

  describe('Win Detection - Multiple Patterns', () => {
    it('should return a winning pattern when multiple patterns complete simultaneously', () => {
      const card = BingoCard.generate('player-1', sampleBuzzwords);

      // Complete row 2 AND column 2 (they overlap at FREE [2,2])
      // Row 2: [2,0], [2,1], FREE, [2,3], [2,4]
      for (let c = 0; c < 5; c++) card.markPosition(2, c);
      // Column 2: [0,2], [1,2], FREE, [3,2], [4,2]
      for (let r = 0; r < 5; r++) card.markPosition(r, 2);

      expect(card.hasWon()).toBe(true);
      const pattern = card.getWinningPattern();
      expect(pattern).not.toBeNull();

      // Should return one valid pattern (either horizontal row 2 or vertical col 2)
      const validPatterns: WinPattern[] = [
        { type: 'horizontal', row: 2 },
        { type: 'vertical', col: 2 },
      ];
      expect(validPatterns).toContainEqual(pattern);
    });

    it('should still return a pattern when both diagonals are complete', () => {
      const card = BingoCard.generate('player-1', sampleBuzzwords);

      // Complete both diagonals
      // TL-BR: [0,0], [1,1], FREE, [3,3], [4,4]
      card.markPosition(0, 0);
      card.markPosition(1, 1);
      card.markPosition(3, 3);
      card.markPosition(4, 4);
      // TR-BL: [0,4], [1,3], FREE, [3,1], [4,0]
      card.markPosition(0, 4);
      card.markPosition(1, 3);
      card.markPosition(3, 1);
      card.markPosition(4, 0);

      expect(card.hasWon()).toBe(true);
      const pattern = card.getWinningPattern();
      expect(pattern).not.toBeNull();

      // Corners are also complete in this scenario, so any of these patterns is valid
      const validPatterns: WinPattern[] = [
        { type: 'diagonal', direction: 'tl-br' },
        { type: 'diagonal', direction: 'tr-bl' },
        { type: 'corners' },
      ];
      expect(validPatterns).toContainEqual(pattern);
    });
  });

  // ─── No Win State ─────────────────────────────────────────────────

  describe('No Win State', () => {
    it('should not have won on a fresh card (only FREE marked)', () => {
      const card = BingoCard.generate('player-1', sampleBuzzwords);
      expect(card.hasWon()).toBe(false);
      expect(card.getWinningPattern()).toBeNull();
    });

    it('should not have won with scattered marks that form no pattern', () => {
      const card = BingoCard.generate('player-1', sampleBuzzwords);
      // Mark some scattered positions that don't complete any line
      card.markPosition(0, 0);
      card.markPosition(1, 2);
      card.markPosition(3, 4);
      card.markPosition(4, 1);

      expect(card.hasWon()).toBe(false);
      expect(card.getWinningPattern()).toBeNull();
    });
  });

  // ─── Grid and Marked Getters ──────────────────────────────────────

  describe('Grid and Marked Getters', () => {
    it('getGrid should return a 5x5 string array', () => {
      const card = BingoCard.generate('player-1', sampleBuzzwords);
      const grid = card.getGrid();

      expect(grid).toHaveLength(5);
      grid.forEach((row) => {
        expect(row).toHaveLength(5);
        row.forEach((cell) => expect(typeof cell).toBe('string'));
      });
    });

    it('getMarked should return a 5x5 boolean array', () => {
      const card = BingoCard.generate('player-1', sampleBuzzwords);
      const marked = card.getMarked();

      expect(marked).toHaveLength(5);
      marked.forEach((row) => {
        expect(row).toHaveLength(5);
        row.forEach((cell) => expect(typeof cell).toBe('boolean'));
      });
    });

    it('getMarked should have only FREE marked initially', () => {
      const card = BingoCard.generate('player-1', sampleBuzzwords);
      const marked = card.getMarked();

      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (r === 2 && c === 2) {
            expect(marked[r][c]).toBe(true);
          } else {
            expect(marked[r][c]).toBe(false);
          }
        }
      }
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should deduplicate words in the word list', () => {
      // Provide 24 unique words plus duplicates
      const duplicated = [...sampleBuzzwords, ...sampleBuzzwords.slice(0, 6)];
      const card = BingoCard.generate('player-1', duplicated);
      const grid = card.getGrid();

      const words: string[] = [];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (r === 2 && c === 2) continue;
          words.push(grid[r][c]);
        }
      }
      expect(new Set(words).size).toBe(24);
    });

    it('should handle a very long word list (100+ words)', () => {
      const longList: string[] = [];
      for (let i = 0; i < 120; i++) {
        longList.push(`word-${i}`);
      }

      const card = BingoCard.generate('player-1', longList);
      const grid = card.getGrid();

      expect(grid).toHaveLength(5);
      expect(grid[2][2]).toBe('FREE');

      // All words on the card should come from the long list
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (r === 2 && c === 2) continue;
          expect(longList).toContain(grid[r][c]);
        }
      }
    });

    it('should filter empty strings from the word list', () => {
      const withBlanks = ['', '  ', ...sampleBuzzwords, '', '  '];
      const card = BingoCard.generate('player-1', withBlanks);
      const grid = card.getGrid();

      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (r === 2 && c === 2) continue;
          expect(grid[r][c].trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('should reject a word list that is too short after filtering and deduplication', () => {
      // 23 unique words + a bunch of duplicates and blanks = still only 23 unique
      const shortAfterCleanup = [
        '', '  ',
        ...sampleBuzzwords.slice(0, 23),
        ...sampleBuzzwords.slice(0, 5), // duplicates
        '', '',
      ];
      expect(() => BingoCard.generate('player-1', shortAfterCleanup)).toThrow();
    });

    it('should generate 50 unique cards for 50 different players', () => {
      const grids: string[] = [];

      for (let i = 0; i < 50; i++) {
        const card = BingoCard.generate(`player-${i}`, sampleBuzzwords);
        grids.push(card.getGrid().flat().join(','));
      }

      // All 50 grids should be unique
      expect(new Set(grids).size).toBe(50);
    });

    it('should handle marking by word when card uses case-insensitive storage', () => {
      // Provide UPPERCASE words in word list
      const uppercaseWords = sampleBuzzwords.map((w) => w.toUpperCase());
      const card = BingoCard.generate('player-1', uppercaseWords);

      // Card words should be case-insensitive matchable
      const firstWord = card.getGrid()[0][0];
      expect(card.markWord(firstWord.toLowerCase())).toBe(true);
    });

    it('should win row 2 with only 4 marks (FREE is pre-marked)', () => {
      const card = BingoCard.generate('player-1', sampleBuzzwords);

      // Row 2: positions [2,0] [2,1] [2,2]=FREE [2,3] [2,4]
      // Only need to mark 4 squares — FREE is already marked
      card.markPosition(2, 0);
      card.markPosition(2, 1);
      card.markPosition(2, 3);
      card.markPosition(2, 4);

      expect(card.hasWon()).toBe(true);
      expect(card.getWinningPattern()).toEqual({ type: 'horizontal', row: 2 });
    });
  });
});
