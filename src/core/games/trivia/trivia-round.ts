import type { AnswerOption, AnswerCounts, RoundResult } from '../../types';

export class TriviaRound {
  readonly questionIndex: number;
  readonly correctAnswer: AnswerOption;

  private readonly playerIds: Set<string>;
  private readonly answers: Map<string, AnswerOption> = new Map();
  private closed = false;
  private result: RoundResult | null = null;

  constructor(questionIndex: number, correctAnswer: AnswerOption, playerIds: string[]) {
    this.questionIndex = questionIndex;
    this.correctAnswer = correctAnswer;
    this.playerIds = new Set(playerIds);
  }

  submitAnswer(playerId: string, answer: AnswerOption): void {
    if (this.closed) return;
    if (this.answers.has(playerId)) return;
    this.answers.set(playerId, answer);
  }

  close(): void {
    this.closed = true;
  }

  resolve(): RoundResult {
    if (!this.closed) {
      throw new Error('Cannot resolve an open round — call close() first');
    }

    const eliminated: string[] = [];
    const survivors: string[] = [];

    for (const playerId of this.playerIds) {
      const answer = this.answers.get(playerId);
      if (answer === this.correctAnswer) {
        survivors.push(playerId);
      } else {
        eliminated.push(playerId);
      }
    }

    this.result = {
      questionIndex: this.questionIndex,
      correctAnswer: this.correctAnswer,
      eliminated,
      survivors,
      counts: this.getAnswerCounts(),
    };

    return this.result;
  }

  getAnswerCounts(): AnswerCounts {
    const counts: AnswerCounts = { A: 0, B: 0, C: 0, D: 0 };
    for (const answer of this.answers.values()) {
      counts[answer]++;
    }
    return counts;
  }

  getResult(): RoundResult {
    if (!this.result) {
      throw new Error('Round has not been resolved yet — call resolve() first');
    }
    return this.result;
  }
}
