import type { MarkResult, Winner } from './types';
import { BingoCard } from './bingo-card';

export class BingoGame {
  readonly sessionId: string;
  readonly wordList: string[];

  private status: 'waiting' | 'active' | 'finished' = 'waiting';
  private currentRound: number = 0;
  private cards: Map<string, BingoCard> = new Map();
  private currentWinner: Winner | null = null;
  private roundWinners: Winner[] = [];

  constructor(sessionId: string, wordList: string[]) {
    // Validate word list: deduplicate and filter, require >= 24 unique
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

    this.sessionId = sessionId;
    this.wordList = wordList;
  }

  start(): void {
    if (this.status !== 'waiting') {
      throw new Error('Game can only be started from waiting status');
    }
    this.status = 'active';
    this.currentRound = 1;
  }

  startNewRound(): void {
    if (this.status !== 'finished') {
      throw new Error('Can only start a new round after the current round is finished');
    }

    // Archive current winner to history
    if (this.currentWinner) {
      this.roundWinners.push(this.currentWinner);
    }

    this.currentWinner = null;
    this.cards.clear();
    this.currentRound++;
    this.status = 'active';
  }

  generateCardForPlayer(playerId: string): BingoCard {
    if (this.status === 'waiting') {
      throw new Error('Cannot generate cards before game starts');
    }

    const card = BingoCard.generate(playerId, this.wordList);
    this.cards.set(playerId, card);
    return card;
  }

  markWord(playerId: string, word: string): MarkResult {
    if (this.status === 'waiting') {
      throw new Error('Cannot mark words before game starts');
    }

    if (this.status === 'finished') {
      return { success: false, bingo: false, roundOver: true };
    }

    const card = this.cards.get(playerId);
    if (!card) {
      return { success: false, bingo: false, roundOver: false };
    }

    const marked = card.markWord(word);
    if (!marked) {
      return { success: false, bingo: false, roundOver: false };
    }

    // Check for win
    if (card.hasWon()) {
      const pattern = card.getWinningPattern()!;
      const winner: Winner = {
        playerId,
        playerName: playerId,
        pattern,
        roundNumber: this.currentRound,
        timestamp: new Date(),
        points: 100,
      };

      this.currentWinner = winner;
      this.status = 'finished';

      return {
        success: true,
        bingo: true,
        pattern,
        roundOver: true,
        winnerId: playerId,
        winnerName: playerId,
      };
    }

    return { success: true, bingo: false, roundOver: false };
  }

  getStatus(): 'waiting' | 'active' | 'finished' {
    return this.status;
  }

  getCurrentRound(): number {
    return this.currentRound;
  }

  getCurrentWinner(): Winner | null {
    return this.currentWinner;
  }

  getRoundWinners(): Winner[] {
    if (this.currentWinner) {
      return [...this.roundWinners, this.currentWinner];
    }
    return [...this.roundWinners];
  }

  getCardForPlayer(playerId: string): BingoCard | null {
    return this.cards.get(playerId) ?? null;
  }
}
