import { randomUUID } from 'crypto';
import type {
  Player,
  PlayerScore,
  GameEvent,
  EventListener,
} from './types';

export class Session {
  readonly id: string;
  readonly gameMode: 'trivia';
  private players: Map<string, Player> = new Map();
  private listeners: EventListener[] = [];
  private scores: Map<string, { totalPoints: number; roundsWon: number; lastWinRound?: number }> = new Map();

  constructor(_gameMode: 'trivia', _wordList: string[]) {
    this.id = randomUUID();
    this.gameMode = 'trivia';
  }

  addPlayer(screenName: string): Player {
    const trimmed = screenName.trim();
    if (trimmed.length === 0) {
      throw new Error('Screen name cannot be blank');
    }

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

  getGameStatus(): 'no_game' {
    return 'no_game';
  }

  getCurrentRound(): number {
    return 0;
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
