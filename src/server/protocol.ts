import type { WinPattern, PlayerScore, AnswerOption } from '../core/types';

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

// Trivia admin → server commands

export interface StartTriviaQuestionCommand {
  type: 'start_trivia_question';
  questionIndex: number;
}

export interface GoLiveCommand {
  type: 'go_live';
}

export interface AdvanceQuestionCommand {
  type: 'advance_question';
}

// Trivia player → server commands

export interface SubmitAnswerCommand {
  type: 'submit_answer';
  answer: AnswerOption;
}

export type Command =
  | CreateSessionCommand
  | StartGameCommand
  | StartNewRoundCommand
  | JoinCommand
  | MarkWordCommand
  | StartTriviaQuestionCommand
  | GoLiveCommand
  | AdvanceQuestionCommand
  | SubmitAnswerCommand;

// Server → Client events (Bingo)

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

// Server → All players (Trivia broadcasts)

export interface QuestionPreviewEvent {
  type: 'question_preview';
  questionIndex: number;
  text: string;
}

export interface QuestionLiveEvent {
  type: 'question_live';
  text: string;
  options: [string, string, string, string];
  timeLimit: number;
}

export interface TimerExpiredEvent {
  type: 'timer_expired';
}

export interface AnswerBreakdownEvent {
  type: 'answer_breakdown';
  counts: { A: number; B: number; C: number; D: number };
  totalAnswered: number;
  totalPlayers: number;
}

export interface AnswerRevealedEvent {
  type: 'answer_revealed';
  correct: AnswerOption;
  eliminated: string[];
  survivors: string[];
}

export interface SurvivorsRegroupedEvent {
  type: 'survivors_regrouped';
  survivorCount: number;
  survivorNames: string[];
}

export interface GameOverEvent {
  type: 'game_over';
  winners: string[];
}

// Server → Individual player (Trivia)

export interface YouAreEliminatedEvent {
  type: 'you_are_eliminated';
  correctAnswer: AnswerOption;
  yourAnswer: AnswerOption | null;
}

export interface YouSurvivedEvent {
  type: 'you_survived';
  survivorCount: number;
}

export interface AnswerAcceptedEvent {
  type: 'answer_accepted';
}

// Server → Admin only (Trivia)

export interface LiveAnswerStatsEvent {
  type: 'live_answer_stats';
  counts: { A: number; B: number; C: number; D: number };
  answered: number;
  remaining: number;
}

export interface QuestionResultEvent {
  type: 'question_result';
  correct: AnswerOption;
  eliminated: string[];
  survivors: string[];
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
  | ErrorEvent
  | QuestionPreviewEvent
  | QuestionLiveEvent
  | TimerExpiredEvent
  | AnswerBreakdownEvent
  | AnswerRevealedEvent
  | SurvivorsRegroupedEvent
  | GameOverEvent
  | YouAreEliminatedEvent
  | YouSurvivedEvent
  | AnswerAcceptedEvent
  | LiveAnswerStatsEvent
  | QuestionResultEvent;

const VALID_ANSWER_OPTIONS = new Set<string>(['A', 'B', 'C', 'D']);

const COMMAND_TYPES = new Set([
  'create_session',
  'start_game',
  'start_new_round',
  'join',
  'mark_word',
  'start_trivia_question',
  'go_live',
  'advance_question',
  'submit_answer',
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

    case 'start_trivia_question':
      if (typeof obj.questionIndex !== 'number') return null;
      return { type: 'start_trivia_question', questionIndex: obj.questionIndex };

    case 'go_live':
      return { type: 'go_live' };

    case 'advance_question':
      return { type: 'advance_question' };

    case 'submit_answer': {
      const answer = typeof obj.answer === 'string' ? obj.answer.toUpperCase() : null;
      if (!answer || !VALID_ANSWER_OPTIONS.has(answer)) return null;
      return { type: 'submit_answer', answer: answer as AnswerOption };
    }

    default:
      return null;
  }
}

export function serializeEvent(event: ServerEvent): string {
  return JSON.stringify(event);
}
