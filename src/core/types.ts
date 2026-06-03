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
  | PlayerJoinedEvent
  | PlayerLeftEvent;

export type EventListener = (event: GameEvent) => void;

// Trivia types

export type AnswerOption = 'A' | 'B' | 'C' | 'D';

export type TriviaState =
  | 'waiting'
  | 'question_preview'
  | 'question_live'
  | 'breakdown'
  | 'answer_revealed'
  | 'survivors'
  | 'game_over';

export interface TriviaQuestion {
  question: string;
  a: string;
  b: string;
  c: string;
  d: string;
  correct: AnswerOption;
}

export interface AnswerCounts {
  A: number;
  B: number;
  C: number;
  D: number;
}

export interface RoundResult {
  questionIndex: number;
  correctAnswer: AnswerOption;
  eliminated: string[];
  survivors: string[];
  counts: AnswerCounts;
  playerAnswers: Record<string, AnswerOption>;
}

export interface TriviaWinner {
  playerId: string;
  screenName: string;
}
