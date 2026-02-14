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
});
