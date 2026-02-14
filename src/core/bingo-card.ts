import { randomUUID } from 'crypto';
import type { WinPattern } from './types';

export class BingoCard {
  readonly id: string;
  readonly playerId: string;

  private grid: string[][];
  private marked: boolean[][];

  private constructor(id: string, playerId: string, grid: string[][], marked: boolean[][]) {
    this.id = id;
    this.playerId = playerId;
    this.grid = grid;
    this.marked = marked;
  }

  static generate(playerId: string, wordList: string[]): BingoCard {
    // Clean: trim, filter empty/whitespace, deduplicate case-insensitively
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const word of wordList) {
      const trimmed = word.trim();
      if (trimmed.length === 0) continue;
      const lower = trimmed.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      cleaned.push(trimmed);
    }

    if (cleaned.length < 24) {
      throw new Error(
        `Word list must contain at least 24 unique words, got ${cleaned.length}`
      );
    }

    // Fisher-Yates shuffle, then take first 24
    const shuffled = [...cleaned];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selected = shuffled.slice(0, 24);

    // Build 5x5 grid — center [2,2] is FREE
    const grid: string[][] = [];
    let idx = 0;
    for (let r = 0; r < 5; r++) {
      const row: string[] = [];
      for (let c = 0; c < 5; c++) {
        if (r === 2 && c === 2) {
          row.push('FREE');
        } else {
          row.push(selected[idx++]);
        }
      }
      grid.push(row);
    }

    // Marked grid — only FREE is pre-marked
    const marked: boolean[][] = Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 5 }, (_, c) => r === 2 && c === 2)
    );

    return new BingoCard(randomUUID(), playerId, grid, marked);
  }

  markWord(word: string): boolean {
    const normalized = word.trim().toLowerCase();
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (this.grid[r][c].toLowerCase() === normalized) {
          this.marked[r][c] = true;
          return true;
        }
      }
    }
    return false;
  }

  markPosition(row: number, col: number): boolean {
    if (row < 0 || row > 4 || col < 0 || col > 4) {
      return false;
    }
    this.marked[row][col] = true;
    return true;
  }

  hasWon(): boolean {
    return this.getWinningPattern() !== null;
  }

  getWinningPattern(): WinPattern | null {
    // Horizontal rows
    for (let r = 0; r < 5; r++) {
      if (this.marked[r][0] && this.marked[r][1] && this.marked[r][2] &&
          this.marked[r][3] && this.marked[r][4]) {
        return { type: 'horizontal', row: r };
      }
    }

    // Vertical columns
    for (let c = 0; c < 5; c++) {
      if (this.marked[0][c] && this.marked[1][c] && this.marked[2][c] &&
          this.marked[3][c] && this.marked[4][c]) {
        return { type: 'vertical', col: c };
      }
    }

    // Diagonal top-left → bottom-right
    if (this.marked[0][0] && this.marked[1][1] && this.marked[2][2] &&
        this.marked[3][3] && this.marked[4][4]) {
      return { type: 'diagonal', direction: 'tl-br' };
    }

    // Diagonal top-right → bottom-left
    if (this.marked[0][4] && this.marked[1][3] && this.marked[2][2] &&
        this.marked[3][1] && this.marked[4][0]) {
      return { type: 'diagonal', direction: 'tr-bl' };
    }

    // Four corners + center
    if (this.marked[0][0] && this.marked[0][4] &&
        this.marked[4][0] && this.marked[4][4] &&
        this.marked[2][2]) {
      return { type: 'corners' };
    }

    return null;
  }

  getGrid(): string[][] {
    return this.grid.map(row => [...row]);
  }

  getMarked(): boolean[][] {
    return this.marked.map(row => [...row]);
  }
}
