import { Session } from '../session';
import type { GameEvent } from '../types';

describe('Session (trivia mode)', () => {
  it('creates a trivia session without a word list', () => {
    const session = new Session('trivia', []);
    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.gameMode).toBe('trivia');
  });

  it('generates a unique session ID', () => {
    const s1 = new Session('trivia', []);
    const s2 = new Session('trivia', []);
    expect(s1.id).not.toBe(s2.id);
  });

  it('starts with no players', () => {
    const session = new Session('trivia', []);
    expect(session.getPlayers()).toEqual([]);
  });

  it('starts with game status no_game', () => {
    const session = new Session('trivia', []);
    expect(session.getGameStatus()).toBe('no_game');
  });

  it('returns empty leaderboard with no players', () => {
    const session = new Session('trivia', []);
    expect(session.getLeaderboard()).toEqual([]);
  });

  it('adds a player and emits player_joined event', () => {
    const session = new Session('trivia', []);
    const events: GameEvent[] = [];
    session.addEventListener((e) => events.push(e));
    const player = session.addPlayer('Alice');
    expect(player.screenName).toBe('Alice');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'player_joined', playerId: player.id, screenName: 'Alice' });
  });

  it('rejects duplicate screen names (case-insensitive)', () => {
    const session = new Session('trivia', []);
    session.addPlayer('Alice');
    expect(() => session.addPlayer('alice')).toThrow(/screen name/i);
    expect(() => session.addPlayer('ALICE')).toThrow(/screen name/i);
  });

  it('rejects blank screen names', () => {
    const session = new Session('trivia', []);
    expect(() => session.addPlayer('')).toThrow();
    expect(() => session.addPlayer('   ')).toThrow();
  });

  it('removes a player and emits player_left event', () => {
    const session = new Session('trivia', []);
    const events: GameEvent[] = [];
    const player = session.addPlayer('Alice');
    session.addEventListener((e) => events.push(e));
    session.removePlayer(player.id);
    expect(session.getPlayers()).toHaveLength(0);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'player_left', playerId: player.id, screenName: 'Alice' });
  });

  it('allows reusing a screen name after removal', () => {
    const session = new Session('trivia', []);
    const player = session.addPlayer('Alice');
    session.removePlayer(player.id);
    const newPlayer = session.addPlayer('Alice');
    expect(newPlayer.screenName).toBe('Alice');
  });

  it('leaderboard includes joined players with 0 points', () => {
    const session = new Session('trivia', []);
    session.addPlayer('Alice');
    session.addPlayer('Bob');
    const board = session.getLeaderboard();
    expect(board).toHaveLength(2);
    expect(board.every((p) => p.totalPoints === 0)).toBe(true);
  });
});
