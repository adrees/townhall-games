export type WinPattern =
  | { type: 'horizontal'; row: number }
  | { type: 'vertical'; col: number }
  | { type: 'diagonal'; direction: 'tl-br' | 'tr-bl' }
  | { type: 'corners' };

export interface MarkResult {
  success: boolean;
  bingo: boolean;
  pattern?: WinPattern;
  roundOver: boolean;
  winnerId?: string;
  winnerName?: string;
}

export interface Winner {
  playerId: string;
  playerName: string;
  pattern: WinPattern;
  roundNumber: number;
  timestamp: Date;
  points: 100;
}

// Session layer types

export interface Player {
  id: string;
  screenName: string;
  joinedAt: Date;
}

export interface PlayerScore {
  playerId: string;
  screenName: string;
  totalPoints: number;
  roundsWon: number;
  lastWinRound?: number;
}

// Game events

export interface GameStartedEvent {
  type: 'game_started';
  roundNumber: number;
  playerId: string;
  playerCard: import('./bingo-card').BingoCard;
}

export interface PlayerWonEvent {
  type: 'player_won';
  winnerId: string;
  winnerName: string;
  pattern: WinPattern;
  roundNumber: number;
  timestamp: Date;
}

export interface NewRoundStartedEvent {
  type: 'new_round_started';
  roundNumber: number;
  playerId: string;
  playerCard: import('./bingo-card').BingoCard;
}

export interface PlayerJoinedEvent {
  type: 'player_joined';
  playerId: string;
  screenName: string;
}

export interface PlayerLeftEvent {
  type: 'player_left';
  playerId: string;
  screenName: string;
}

export type GameEvent =
  | GameStartedEvent
  | PlayerWonEvent
  | NewRoundStartedEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent;

export type EventListener = (event: GameEvent) => void;
