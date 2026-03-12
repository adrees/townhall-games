import type { TriviaQuestion, TriviaState, TriviaWinner } from '../../types';
import { TriviaRound } from './trivia-round';

export class TriviaGame {
  static readonly REVEAL_DELAY_MS = 2500;

  readonly sessionId: string;
  readonly questions: TriviaQuestion[];
  readonly questionTimeLimitMs: number;

  private _state: TriviaState = 'waiting';
  private _currentQuestionIndex = -1;
  private _survivorIds: Set<string>;
  private _allPlayerIds: string[];
  private _currentRound: TriviaRound | null = null;
  private _winners: TriviaWinner[] = [];

  constructor(
    sessionId: string,
    questions: TriviaQuestion[],
    options?: { speedMode?: boolean }
  ) {
    this.sessionId = sessionId;
    this.questions = questions;
    this.questionTimeLimitMs = options?.speedMode ? 3000 : 10000;
    this._allPlayerIds = [];
    this._survivorIds = new Set();
  }

  get state(): TriviaState {
    return this._state;
  }

  /** Call before goLive() to register players. Must be called in waiting state. */
  registerPlayers(playerIds: string[]): void {
    this._allPlayerIds = [...playerIds];
    this._survivorIds = new Set(playerIds);
  }

  previewQuestion(index: number): void {
    this._assertState(['waiting', 'survivors'], 'previewQuestion');
    if (index < 0 || index >= this.questions.length) {
      throw new Error(`Question index ${index} out of range (0–${this.questions.length - 1})`);
    }
    this._currentQuestionIndex = index;
    this._state = 'question_preview';
  }

  goLive(): void {
    this._assertState(['question_preview'], 'goLive');
    const question = this.questions[this._currentQuestionIndex];
    this._currentRound = new TriviaRound(
      this._currentQuestionIndex,
      question.correct,
      [...this._survivorIds]
    );
    this._state = 'question_live';
  }

  expireTimer(): void {
    this._assertState(['question_live'], 'expireTimer');
    this._currentRound!.close();
    this._state = 'breakdown';
  }

  revealAnswer(): void {
    this._assertState(['breakdown'], 'revealAnswer');
    const result = this._currentRound!.resolve();
    this._survivorIds = new Set(result.survivors);
    this._state = 'answer_revealed';
  }

  showSurvivors(): void {
    this._assertState(['answer_revealed'], 'showSurvivors');
    const moreQuestions = this._currentQuestionIndex < this.questions.length - 1;
    if (!moreQuestions) {
      this._winners = [...this._survivorIds].map(id => ({ playerId: id, screenName: id }));
      this._state = 'game_over';
    } else {
      this._state = 'survivors';
    }
  }

  getCurrentQuestion(): TriviaQuestion | null {
    if (this._currentQuestionIndex < 0) return null;
    return this.questions[this._currentQuestionIndex] ?? null;
  }

  getCurrentRound(): TriviaRound | null {
    return this._currentRound;
  }

  getSurvivors(): string[] {
    return [...this._survivorIds];
  }

  getWinners(): TriviaWinner[] {
    return [...this._winners];
  }

  private _assertState(allowed: TriviaState[], method: string): void {
    if (!allowed.includes(this._state)) {
      throw new Error(
        `${method}() called in state "${this._state}" — allowed states: ${allowed.join(', ')}`
      );
    }
  }
}
