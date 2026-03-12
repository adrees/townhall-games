import { parseCommand, serializeEvent, type ServerEvent } from '../protocol';

describe('parseCommand', () => {
  it('returns null for invalid JSON', () => {
    expect(parseCommand('not json')).toBeNull();
  });

  it('returns null for non-object JSON', () => {
    expect(parseCommand('"hello"')).toBeNull();
    expect(parseCommand('42')).toBeNull();
    expect(parseCommand('null')).toBeNull();
  });

  it('returns null for missing type', () => {
    expect(parseCommand('{}')).toBeNull();
  });

  it('returns null for unknown type', () => {
    expect(parseCommand('{"type":"unknown"}')).toBeNull();
  });

  describe('create_session', () => {
    it('parses valid create_session', () => {
      const cmd = parseCommand('{"type":"create_session","words":["a","b","c"]}');
      expect(cmd).toEqual({ type: 'create_session', words: ['a', 'b', 'c'] });
    });

    it('returns null if words is missing', () => {
      expect(parseCommand('{"type":"create_session"}')).toBeNull();
    });

    it('returns null if words is not an array', () => {
      expect(parseCommand('{"type":"create_session","words":"hello"}')).toBeNull();
    });

    it('returns null if words contains non-strings', () => {
      expect(parseCommand('{"type":"create_session","words":[1,2]}')).toBeNull();
    });
  });

  describe('start_game', () => {
    it('parses valid start_game', () => {
      expect(parseCommand('{"type":"start_game"}')).toEqual({ type: 'start_game' });
    });
  });

  describe('start_new_round', () => {
    it('parses valid start_new_round', () => {
      expect(parseCommand('{"type":"start_new_round"}')).toEqual({ type: 'start_new_round' });
    });
  });

  describe('join', () => {
    it('parses valid join', () => {
      expect(parseCommand('{"type":"join","screenName":"Alice"}')).toEqual({
        type: 'join',
        screenName: 'Alice',
      });
    });

    it('returns null if screenName is missing', () => {
      expect(parseCommand('{"type":"join"}')).toBeNull();
    });

    it('returns null if screenName is not a string', () => {
      expect(parseCommand('{"type":"join","screenName":42}')).toBeNull();
    });
  });

  describe('mark_word', () => {
    it('parses valid mark_word', () => {
      expect(parseCommand('{"type":"mark_word","word":"synergy"}')).toEqual({
        type: 'mark_word',
        word: 'synergy',
      });
    });

    it('returns null if word is missing', () => {
      expect(parseCommand('{"type":"mark_word"}')).toBeNull();
    });
  });

  describe('start_trivia_question', () => {
    it('parses valid start_trivia_question', () => {
      expect(parseCommand('{"type":"start_trivia_question","questionIndex":0}')).toEqual({
        type: 'start_trivia_question',
        questionIndex: 0,
      });
    });

    it('returns null if questionIndex is missing', () => {
      expect(parseCommand('{"type":"start_trivia_question"}')).toBeNull();
    });

    it('returns null if questionIndex is not a number', () => {
      expect(parseCommand('{"type":"start_trivia_question","questionIndex":"zero"}')).toBeNull();
    });
  });

  describe('go_live', () => {
    it('parses valid go_live', () => {
      expect(parseCommand('{"type":"go_live"}')).toEqual({ type: 'go_live' });
    });
  });

  describe('advance_question', () => {
    it('parses valid advance_question', () => {
      expect(parseCommand('{"type":"advance_question"}')).toEqual({ type: 'advance_question' });
    });
  });

  describe('submit_answer', () => {
    it('parses valid answer A', () => {
      expect(parseCommand('{"type":"submit_answer","answer":"A"}')).toEqual({
        type: 'submit_answer',
        answer: 'A',
      });
    });

    it('normalises lowercase answer to uppercase', () => {
      expect(parseCommand('{"type":"submit_answer","answer":"b"}')).toEqual({
        type: 'submit_answer',
        answer: 'B',
      });
    });

    it('returns null for invalid answer value E', () => {
      expect(parseCommand('{"type":"submit_answer","answer":"E"}')).toBeNull();
    });

    it('returns null if answer field is missing', () => {
      expect(parseCommand('{"type":"submit_answer"}')).toBeNull();
    });
  });
});

describe('serializeEvent', () => {
  it('serializes an event to JSON', () => {
    const event: ServerEvent = { type: 'session_created', sessionId: 'abc-123' };
    const result = serializeEvent(event);
    expect(JSON.parse(result)).toEqual({ type: 'session_created', sessionId: 'abc-123' });
  });

  it('serializes error event', () => {
    const event: ServerEvent = { type: 'error', message: 'something went wrong' };
    const result = serializeEvent(event);
    expect(JSON.parse(result)).toEqual({ type: 'error', message: 'something went wrong' });
  });

  it('serializes leaderboard event', () => {
    const event: ServerEvent = {
      type: 'leaderboard',
      entries: [
        { playerId: 'p1', screenName: 'Alice', totalPoints: 100, roundsWon: 1 },
      ],
    };
    const result = serializeEvent(event);
    expect(JSON.parse(result)).toEqual(event);
  });

  describe('trivia broadcast events', () => {
    it('serializes question_preview', () => {
      const e: ServerEvent = { type: 'question_preview', questionIndex: 0, text: 'Who?' };
      const p = JSON.parse(serializeEvent(e));
      expect(p.type).toBe('question_preview');
      expect(p.questionIndex).toBe(0);
      expect(p.text).toBe('Who?');
    });

    it('serializes question_live with options and timeLimit', () => {
      const e: ServerEvent = { type: 'question_live', text: 'Q?', options: ['A1','B1','C1','D1'], timeLimit: 10 };
      const p = JSON.parse(serializeEvent(e));
      expect(p.type).toBe('question_live');
      expect(p.options).toHaveLength(4);
      expect(p.timeLimit).toBe(10);
    });

    it('serializes timer_expired', () => {
      const e: ServerEvent = { type: 'timer_expired' };
      expect(JSON.parse(serializeEvent(e))).toEqual({ type: 'timer_expired' });
    });

    it('serializes answer_breakdown with counts', () => {
      const e: ServerEvent = { type: 'answer_breakdown', counts: { A:1,B:2,C:0,D:0 }, totalAnswered: 3, totalPlayers: 5 };
      const p = JSON.parse(serializeEvent(e));
      expect(p.type).toBe('answer_breakdown');
      expect(p.counts.B).toBe(2);
      expect(p.totalAnswered).toBe(3);
      expect(p.totalPlayers).toBe(5);
    });

    it('serializes answer_revealed with correct, eliminated, survivors', () => {
      const e: ServerEvent = { type: 'answer_revealed', correct: 'B', eliminated: ['p1'], survivors: ['p2'] };
      const p = JSON.parse(serializeEvent(e));
      expect(p.type).toBe('answer_revealed');
      expect(p.correct).toBe('B');
      expect(p.eliminated).toEqual(['p1']);
    });

    it('serializes survivors_regrouped', () => {
      const e: ServerEvent = { type: 'survivors_regrouped', survivorCount: 3, survivorNames: ['Alice','Bob','Carol'] };
      const p = JSON.parse(serializeEvent(e));
      expect(p.type).toBe('survivors_regrouped');
      expect(p.survivorCount).toBe(3);
      expect(p.survivorNames).toHaveLength(3);
    });

    it('serializes game_over with winners', () => {
      const e: ServerEvent = { type: 'game_over', winners: ['Alice'] };
      const p = JSON.parse(serializeEvent(e));
      expect(p.type).toBe('game_over');
      expect(p.winners).toEqual(['Alice']);
    });
  });

  describe('trivia per-player events', () => {
    it('serializes you_are_eliminated', () => {
      const e: ServerEvent = { type: 'you_are_eliminated', correctAnswer: 'B', yourAnswer: 'A' };
      const p = JSON.parse(serializeEvent(e));
      expect(p.type).toBe('you_are_eliminated');
      expect(p.correctAnswer).toBe('B');
      expect(p.yourAnswer).toBe('A');
    });

    it('serializes you_are_eliminated with null yourAnswer', () => {
      const e: ServerEvent = { type: 'you_are_eliminated', correctAnswer: 'C', yourAnswer: null };
      expect(JSON.parse(serializeEvent(e)).yourAnswer).toBeNull();
    });

    it('serializes you_survived', () => {
      const e: ServerEvent = { type: 'you_survived', survivorCount: 5 };
      const p = JSON.parse(serializeEvent(e));
      expect(p.type).toBe('you_survived');
      expect(p.survivorCount).toBe(5);
    });

    it('serializes answer_accepted', () => {
      const e: ServerEvent = { type: 'answer_accepted' };
      expect(JSON.parse(serializeEvent(e))).toEqual({ type: 'answer_accepted' });
    });
  });

  describe('trivia admin-only events', () => {
    it('serializes live_answer_stats', () => {
      const e: ServerEvent = { type: 'live_answer_stats', counts: { A:1,B:0,C:0,D:0 }, answered: 1, remaining: 4 };
      const p = JSON.parse(serializeEvent(e));
      expect(p.type).toBe('live_answer_stats');
      expect(p.answered).toBe(1);
      expect(p.remaining).toBe(4);
    });

    it('serializes question_result', () => {
      const e: ServerEvent = { type: 'question_result', correct: 'A', eliminated: ['p2'], survivors: ['p1'] };
      const p = JSON.parse(serializeEvent(e));
      expect(p.type).toBe('question_result');
      expect(p.correct).toBe('A');
      expect(p.survivors).toEqual(['p1']);
    });
  });
});
