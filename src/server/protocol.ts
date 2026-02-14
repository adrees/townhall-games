import type { WinPattern, PlayerScore } from '../core/types';

// Client → Server commands

export interface CreateSessionCommand {
  type: 'create_session';
  words: string[];
}

export interface StartGameCommand {
  type: 'start_game';
}

export interface StartNewRoundCommand {
  type: 'start_new_round';
}

export interface JoinCommand {
  type: 'join';
  screenName: string;
}

export interface MarkWordCommand {
  type: 'mark_word';
  word: string;
}

export type Command =
  | CreateSessionCommand
  | StartGameCommand
  | StartNewRoundCommand
  | JoinCommand
  | MarkWordCommand;

// Server → Client events

export interface SessionCreatedEvent {
  type: 'session_created';
  sessionId: string;
}

export interface JoinedEvent {
  type: 'joined';
  playerId: string;
  screenName: string;
  gameStatus: string;
  round: number;
}

export interface CardDealtEvent {
  type: 'card_dealt';
  roundNumber: number;
  grid: string[][];
  marked: boolean[][];
}

export interface PlayerJoinedEvent {
  type: 'player_joined';
  playerId: string;
  screenName: string;
  playerCount: number;
}

export interface PlayerLeftEvent {
  type: 'player_left';
  playerId: string;
  screenName: string;
  playerCount: number;
}

export interface MarkResultEvent {
  type: 'mark_result';
  success: boolean;
  word: string;
  bingo: boolean;
  roundOver: boolean;
}

export interface PlayerWonEvent {
  type: 'player_won';
  winnerName: string;
  pattern: WinPattern;
  roundNumber: number;
}

export interface GameStatusEvent {
  type: 'game_status';
  status: string;
  round: number;
}

export interface LeaderboardEvent {
  type: 'leaderboard';
  entries: PlayerScore[];
}

export interface ErrorEvent {
  type: 'error';
  message: string;
}

export type ServerEvent =
  | SessionCreatedEvent
  | JoinedEvent
  | CardDealtEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | MarkResultEvent
  | PlayerWonEvent
  | GameStatusEvent
  | LeaderboardEvent
  | ErrorEvent;

const COMMAND_TYPES = new Set([
  'create_session',
  'start_game',
  'start_new_round',
  'join',
  'mark_word',
]);

export function parseCommand(raw: string): Command | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.type !== 'string' || !COMMAND_TYPES.has(obj.type)) return null;

  switch (obj.type) {
    case 'create_session':
      if (!Array.isArray(obj.words) || !obj.words.every((w: unknown) => typeof w === 'string')) {
        return null;
      }
      return { type: 'create_session', words: obj.words as string[] };

    case 'start_game':
      return { type: 'start_game' };

    case 'start_new_round':
      return { type: 'start_new_round' };

    case 'join':
      if (typeof obj.screenName !== 'string') return null;
      return { type: 'join', screenName: obj.screenName };

    case 'mark_word':
      if (typeof obj.word !== 'string') return null;
      return { type: 'mark_word', word: obj.word };

    default:
      return null;
  }
}

export function serializeEvent(event: ServerEvent): string {
  return JSON.stringify(event);
}
