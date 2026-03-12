import { TriviaRound } from '../games/trivia/trivia-round';

const PLAYERS = ['alice', 'bob', 'carol'];
const CORRECT = 'B' as const;

function makeRound(players = PLAYERS) {
  return new TriviaRound(0, CORRECT, players);
}

describe('TriviaRound', () => {
  describe('answer submission', () => {
    it('accepts a valid answer while the round is open', () => {
      const round = makeRound();
      round.submitAnswer('alice', 'A');
      round.close();
      round.resolve();
      const counts = round.getAnswerCounts();
      expect(counts.A).toBe(1);
    });

    it('ignores a duplicate answer from the same player (original retained)', () => {
      const round = makeRound();
      round.submitAnswer('alice', 'A');
      round.submitAnswer('alice', 'B'); // second submission ignored
      round.close();
      round.resolve();
      const counts = round.getAnswerCounts();
      expect(counts.A).toBe(1);
      expect(counts.B).toBe(0);
    });

    it('ignores an answer submitted after close()', () => {
      const round = makeRound();
      round.close();
      round.submitAnswer('alice', 'A'); // post-close, ignored
      round.resolve();
      expect(round.getAnswerCounts().A).toBe(0);
    });
  });

  describe('close()', () => {
    it('prevents further submissions after close', () => {
      const round = makeRound();
      round.submitAnswer('alice', 'A');
      round.close();
      round.submitAnswer('bob', 'B');
      round.resolve();
      // bob's answer was post-close
      expect(round.getAnswerCounts().B).toBe(0);
    });
  });

  describe('resolve()', () => {
    it('throws if called before close()', () => {
      const round = makeRound();
      expect(() => round.resolve()).toThrow();
    });

    it('eliminates players with wrong answer', () => {
      const round = makeRound();
      round.submitAnswer('alice', 'A'); // wrong
      round.submitAnswer('bob', CORRECT); // correct
      round.submitAnswer('carol', 'C'); // wrong
      round.close();
      const result = round.resolve();
      expect(result.eliminated).toContain('alice');
      expect(result.eliminated).toContain('carol');
      expect(result.eliminated).not.toContain('bob');
    });

    it('eliminates players who did not answer', () => {
      const round = makeRound();
      round.submitAnswer('bob', CORRECT); // only bob answers
      round.close();
      const result = round.resolve();
      expect(result.eliminated).toContain('alice');
      expect(result.eliminated).toContain('carol');
    });

    it('includes players with correct answer in survivors', () => {
      const round = makeRound();
      round.submitAnswer('alice', CORRECT);
      round.submitAnswer('bob', CORRECT);
      round.submitAnswer('carol', 'A');
      round.close();
      const result = round.resolve();
      expect(result.survivors).toContain('alice');
      expect(result.survivors).toContain('bob');
      expect(result.survivors).not.toContain('carol');
    });

    it('all survivors when everyone answers correctly', () => {
      const round = makeRound();
      PLAYERS.forEach(p => round.submitAnswer(p, CORRECT));
      round.close();
      const result = round.resolve();
      expect(result.survivors).toHaveLength(3);
      expect(result.eliminated).toHaveLength(0);
    });

    it('no survivors when all answer wrong', () => {
      const round = makeRound();
      PLAYERS.forEach(p => round.submitAnswer(p, 'A'));
      round.close();
      const result = round.resolve();
      expect(result.survivors).toHaveLength(0);
      expect(result.eliminated).toHaveLength(3);
    });
  });

  describe('getAnswerCounts()', () => {
    it('returns correct per-option totals', () => {
      const round = makeRound(['p1', 'p2', 'p3', 'p4', 'p5']);
      round.submitAnswer('p1', 'A');
      round.submitAnswer('p2', 'A');
      round.submitAnswer('p3', 'B');
      round.submitAnswer('p4', 'C');
      // p5 does not answer
      round.close();
      round.resolve();
      const counts = round.getAnswerCounts();
      expect(counts.A).toBe(2);
      expect(counts.B).toBe(1);
      expect(counts.C).toBe(1);
      expect(counts.D).toBe(0);
    });
  });

  describe('getResult()', () => {
    it('throws before resolve() is called', () => {
      const round = makeRound();
      round.close();
      expect(() => round.getResult()).toThrow();
    });

    it('returns the result after resolve()', () => {
      const round = makeRound();
      round.submitAnswer('alice', CORRECT);
      round.close();
      round.resolve();
      const result = round.getResult();
      expect(result.correctAnswer).toBe(CORRECT);
      expect(result.survivors).toContain('alice');
    });
  });
});
