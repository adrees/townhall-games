import type { PlayerScore, AnswerOption, TriviaQuestion } from '../core/types';

// Client → Server commands

export interface CreateSessionCommand {
  type: 'create_session';
  questions: TriviaQuestion[];
  speed?: boolean;
}

export interface JoinCommand {
  type: 'join';
  screenName: string;
}

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

export interface SubmitAnswerCommand {
  type: 'submit_answer';
  answer: AnswerOption;
}

export interface RegisterSpectatorCommand {
  type: 'register_spectator';
}

export interface RestartGameCommand {
  type: 'restart_game';
}

export type Command =
  | CreateSessionCommand
  | JoinCommand
  | StartTriviaQuestionCommand
  | GoLiveCommand
  | AdvanceQuestionCommand
  | SubmitAnswerCommand
  | RegisterSpectatorCommand
  | RestartGameCommand;

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

export interface GameStatusEvent {
  type: 'game_status';
  status: string;
  round: number;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
}

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

export interface LeaderboardEvent {
  type: 'leaderboard';
  entries: PlayerScore[];
}

export interface GameResetEvent {
  type: 'game_reset';
}

export type ServerEvent =
  | SessionCreatedEvent
  | JoinedEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | GameStatusEvent
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
  | QuestionResultEvent
  | LeaderboardEvent
  | GameResetEvent;

const VALID_ANSWER_OPTIONS = new Set<string>(['A', 'B', 'C', 'D']);

const COMMAND_TYPES = new Set([
  'create_session',
  'join',
  'start_trivia_question',
  'go_live',
  'advance_question',
  'submit_answer',
  'register_spectator',
  'restart_game',
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
    case 'create_session': {
      if (!Array.isArray(obj.questions)) return null;
      const questions = obj.questions as Record<string, unknown>[];
      const validQuestions = questions.every(
        (q) =>
          typeof q === 'object' && q !== null &&
          typeof q.question === 'string' && q.question.trim() !== '' &&
          typeof q.a === 'string' && typeof q.b === 'string' &&
          typeof q.c === 'string' && typeof q.d === 'string' &&
          VALID_ANSWER_OPTIONS.has(q.correct as string)
      );
      if (!validQuestions) return null;
      return {
        type: 'create_session',
        questions: obj.questions as TriviaQuestion[],
        speed: obj.speed === true,
      };
    }

    case 'join':
      if (typeof obj.screenName !== 'string') return null;
      return { type: 'join', screenName: obj.screenName };

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

    case 'register_spectator':
      return { type: 'register_spectator' };

    case 'restart_game':
      return { type: 'restart_game' };

    default:
      return null;
  }
}

export function serializeEvent(event: ServerEvent): string {
  return JSON.stringify(event);
}
