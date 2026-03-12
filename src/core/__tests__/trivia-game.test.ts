import { TriviaGame } from '../games/trivia/trivia-game';
import type { TriviaQuestion } from '../types';

const QUESTIONS: TriviaQuestion[] = [
  { question: 'Q1', a: 'A1', b: 'B1', c: 'C1', d: 'D1', correct: 'A' },
  { question: 'Q2', a: 'A2', b: 'B2', c: 'C2', d: 'D2', correct: 'B' },
  { question: 'Q3', a: 'A3', b: 'B3', c: 'C3', d: 'D3', correct: 'C' },
];

const PLAYERS = ['alice', 'bob', 'carol'];

function makeGame(questions = QUESTIONS) {
  const game = new TriviaGame('test-session', questions);
  game.registerPlayers(PLAYERS);
  return game;
}

/** Run through all phases for one question, with all players answering correctly. */
function runQuestion(game: TriviaGame, index: number, survivors: string[]) {
  game.previewQuestion(index);
  game.goLive();
  const round = game.getCurrentRound()!;
  survivors.forEach(p => round.submitAnswer(p, game.questions[index].correct));
  game.expireTimer();
  game.revealAnswer();
  game.showSurvivors();
}

describe('TriviaGame', () => {
  describe('initial state', () => {
    it('starts in waiting state', () => {
      const game = makeGame();
      expect(game.state).toBe('waiting');
    });

    it('exposes REVEAL_DELAY_MS = 2500', () => {
      expect(TriviaGame.REVEAL_DELAY_MS).toBe(2500);
    });

    it('has questionTimeLimitMs = 10000 by default', () => {
      const game = makeGame();
      expect(game.questionTimeLimitMs).toBe(10000);
    });
  });

  describe('speedMode', () => {
    it('sets questionTimeLimitMs to 3000 when speedMode: true', () => {
      const game = new TriviaGame('s', QUESTIONS, { speedMode: true });
      expect(game.questionTimeLimitMs).toBe(3000);
    });
  });

  describe('state transitions', () => {
    it('previewQuestion() from waiting → question_preview', () => {
      const game = makeGame();
      game.previewQuestion(0);
      expect(game.state).toBe('question_preview');
    });

    it('goLive() from question_preview → question_live', () => {
      const game = makeGame();
      game.previewQuestion(0);
      game.goLive();
      expect(game.state).toBe('question_live');
    });

    it('expireTimer() from question_live → breakdown', () => {
      const game = makeGame();
      game.previewQuestion(0);
      game.goLive();
      game.expireTimer();
      expect(game.state).toBe('breakdown');
    });

    it('revealAnswer() from breakdown → answer_revealed', () => {
      const game = makeGame();
      game.previewQuestion(0);
      game.goLive();
      game.expireTimer();
      game.revealAnswer();
      expect(game.state).toBe('answer_revealed');
    });

    it('showSurvivors() → survivors when questions remain', () => {
      const game = makeGame();
      game.previewQuestion(0);
      game.goLive();
      game.expireTimer();
      game.revealAnswer();
      game.showSurvivors();
      expect(game.state).toBe('survivors');
    });

    it('previewQuestion() from survivors → question_preview', () => {
      const game = makeGame();
      runQuestion(game, 0, PLAYERS);
      expect(game.state).toBe('survivors');
      game.previewQuestion(1);
      expect(game.state).toBe('question_preview');
    });

    it('showSurvivors() → game_over when no questions remain', () => {
      const game = makeGame(QUESTIONS.slice(0, 1)); // single question game
      game.registerPlayers(PLAYERS);
      game.previewQuestion(0);
      game.goLive();
      PLAYERS.forEach(p => game.getCurrentRound()!.submitAnswer(p, 'A'));
      game.expireTimer();
      game.revealAnswer();
      game.showSurvivors();
      expect(game.state).toBe('game_over');
    });
  });

  describe('illegal transitions', () => {
    it('goLive() in waiting throws and state is unchanged', () => {
      const game = makeGame();
      expect(() => game.goLive()).toThrow();
      expect(game.state).toBe('waiting');
    });

    it('expireTimer() in question_preview throws', () => {
      const game = makeGame();
      game.previewQuestion(0);
      expect(() => game.expireTimer()).toThrow();
      expect(game.state).toBe('question_preview');
    });

    it('revealAnswer() in question_live throws', () => {
      const game = makeGame();
      game.previewQuestion(0);
      game.goLive();
      expect(() => game.revealAnswer()).toThrow();
      expect(game.state).toBe('question_live');
    });

    it('showSurvivors() in breakdown throws', () => {
      const game = makeGame();
      game.previewQuestion(0);
      game.goLive();
      game.expireTimer();
      expect(() => game.showSurvivors()).toThrow();
      expect(game.state).toBe('breakdown');
    });
  });

  describe('survivor tracking', () => {
    it('getSurvivors() returns all players before any question', () => {
      const game = makeGame();
      expect(game.getSurvivors()).toEqual(expect.arrayContaining(PLAYERS));
    });

    it('getSurvivors() updates after a question with eliminations', () => {
      const game = makeGame();
      game.previewQuestion(0); // correct is 'A'
      game.goLive();
      const round = game.getCurrentRound()!;
      round.submitAnswer('alice', 'A'); // correct
      round.submitAnswer('bob', 'B');   // wrong
      round.submitAnswer('carol', 'C'); // wrong
      game.expireTimer();
      game.revealAnswer();
      expect(game.getSurvivors()).toEqual(['alice']);
    });
  });

  describe('winners', () => {
    it('multiple survivors after final question are all winners', () => {
      const game = new TriviaGame('s', QUESTIONS.slice(0, 1));
      game.registerPlayers(PLAYERS);
      game.previewQuestion(0);
      game.goLive();
      const round = game.getCurrentRound()!;
      PLAYERS.forEach(p => round.submitAnswer(p, 'A')); // all correct
      game.expireTimer();
      game.revealAnswer();
      game.showSurvivors();
      expect(game.state).toBe('game_over');
      expect(game.getWinners()).toHaveLength(3);
    });

    it('single survivor becomes sole winner', () => {
      const game = new TriviaGame('s', QUESTIONS.slice(0, 1));
      game.registerPlayers(PLAYERS);
      game.previewQuestion(0);
      game.goLive();
      const round = game.getCurrentRound()!;
      round.submitAnswer('alice', 'A'); // correct
      round.submitAnswer('bob', 'B');   // wrong
      round.submitAnswer('carol', 'C'); // wrong
      game.expireTimer();
      game.revealAnswer();
      game.showSurvivors();
      const winners = game.getWinners();
      expect(winners).toHaveLength(1);
      expect(winners[0].playerId).toBe('alice');
    });

    it('no survivors → getWinners() returns empty array', () => {
      const game = new TriviaGame('s', QUESTIONS.slice(0, 1));
      game.registerPlayers(PLAYERS);
      game.previewQuestion(0);
      game.goLive();
      PLAYERS.forEach(p => game.getCurrentRound()!.submitAnswer(p, 'D')); // all wrong
      game.expireTimer();
      game.revealAnswer();
      game.showSurvivors();
      expect(game.getWinners()).toHaveLength(0);
    });
  });
});
