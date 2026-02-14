import { randomUUID } from 'crypto';
import { BingoGame } from './bingo-game';
import { BingoCard } from './bingo-card';
import type {
  Player,
  PlayerScore,
  MarkResult,
  GameEvent,
  EventListener,
  WinPattern,
} from './types';

export class Session {
  readonly id: string;
  private readonly wordList: string[];
  private players: Map<string, Player> = new Map();
  private game: BingoGame | null = null;
  private listeners: EventListener[] = [];
  private scores: Map<string, { totalPoints: number; roundsWon: number; lastWinRound?: number }> = new Map();

  constructor(wordList: string[]) {
    // Validate word list by trying to construct a BingoGame (reuses its validation)
    // We create a throwaway game just to validate, then discard it
    new BingoGame('validate', wordList);
    this.id = randomUUID();
    this.wordList = wordList;
  }

  addPlayer(screenName: string): Player {
    const trimmed = screenName.trim();
    if (trimmed.length === 0) {
      throw new Error('Screen name cannot be blank');
    }

    // Check uniqueness (case-insensitive)
    const lower = trimmed.toLowerCase();
    for (const p of this.players.values()) {
      if (p.screenName.toLowerCase() === lower) {
        throw new Error(`Screen name "${trimmed}" is already taken`);
      }
    }

    const player: Player = {
      id: randomUUID(),
      screenName: trimmed,
      joinedAt: new Date(),
    };

    this.players.set(player.id, player);
    this.scores.set(player.id, { totalPoints: 0, roundsWon: 0 });

    this.emit({ type: 'player_joined', playerId: player.id, screenName: trimmed });

    // Late joiner: auto-generate card if game is active
    if (this.game && this.game.getStatus() === 'active') {
      const card = this.game.generateCardForPlayer(player.id);
      this.emit({
        type: 'game_started',
        roundNumber: this.game.getCurrentRound(),
        playerId: player.id,
        playerCard: card,
      });
    }

    return player;
  }

  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    this.players.delete(playerId);
    this.scores.delete(playerId);

    this.emit({ type: 'player_left', playerId, screenName: player.screenName });
  }

  getPlayer(playerId: string): Player | null {
    return this.players.get(playerId) ?? null;
  }

  getPlayers(): Player[] {
    return [...this.players.values()];
  }

  startGame(): void {
    if (this.players.size === 0) {
      throw new Error('Cannot start game: at least 1 player required');
    }

    this.game = new BingoGame(this.id, this.wordList);
    this.game.start();

    // Generate cards for all players and emit events
    for (const player of this.players.values()) {
      const card = this.game.generateCardForPlayer(player.id);
      this.emit({
        type: 'game_started',
        roundNumber: 1,
        playerId: player.id,
        playerCard: card,
      });
    }
  }

  startNewRound(): void {
    if (!this.game) {
      throw new Error('No game to start a new round for');
    }

    this.game.startNewRound();

    // Generate new cards for all current players
    for (const player of this.players.values()) {
      const card = this.game.generateCardForPlayer(player.id);
      this.emit({
        type: 'new_round_started',
        roundNumber: this.game.getCurrentRound(),
        playerId: player.id,
        playerCard: card,
      });
    }
  }

  markWord(playerId: string, word: string): MarkResult {
    if (!this.game) {
      throw new Error('No game is active');
    }

    const result = this.game.markWord(playerId, word);

    // Enrich winnerName with screen name
    if (result.bingo && result.winnerId) {
      const winner = this.players.get(result.winnerId);
      if (winner) {
        result.winnerName = winner.screenName;
      }

      // Update scores
      const score = this.scores.get(result.winnerId);
      if (score) {
        score.totalPoints += 100;
        score.roundsWon += 1;
        score.lastWinRound = this.game.getCurrentRound();
      }

      // Emit player_won
      this.emit({
        type: 'player_won',
        winnerId: result.winnerId,
        winnerName: winner?.screenName ?? result.winnerId,
        pattern: result.pattern!,
        roundNumber: this.game.getCurrentRound(),
        timestamp: new Date(),
      });
    }

    return result;
  }

  getGameStatus(): 'waiting' | 'active' | 'finished' | 'no_game' {
    if (!this.game) return 'no_game';
    return this.game.getStatus();
  }

  getCurrentRound(): number {
    if (!this.game) return 0;
    return this.game.getCurrentRound();
  }

  getCardForPlayer(playerId: string): BingoCard | null {
    if (!this.game) return null;
    return this.game.getCardForPlayer(playerId);
  }

  getCurrentWinner(): { playerId: string; screenName: string; pattern: WinPattern; roundNumber: number } | null {
    if (!this.game) return null;
    const winner = this.game.getCurrentWinner();
    if (!winner) return null;

    const player = this.players.get(winner.playerId);
    return {
      playerId: winner.playerId,
      screenName: player?.screenName ?? winner.playerId,
      pattern: winner.pattern,
      roundNumber: winner.roundNumber,
    };
  }

  getLeaderboard(): PlayerScore[] {
    const board: PlayerScore[] = [];
    for (const player of this.players.values()) {
      const score = this.scores.get(player.id) ?? { totalPoints: 0, roundsWon: 0 };
      board.push({
        playerId: player.id,
        screenName: player.screenName,
        totalPoints: score.totalPoints,
        roundsWon: score.roundsWon,
        lastWinRound: score.lastWinRound,
      });
    }
    board.sort((a, b) => b.totalPoints - a.totalPoints);
    return board;
  }

  addEventListener(listener: EventListener): void {
    this.listeners.push(listener);
  }

  removeEventListener(listener: EventListener): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private emit(event: GameEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Listener errors are caught and swallowed
      }
    }
  }
}
