import { state, resetState, markWordLocally } from '../state.js';

const WORDS: string[][] = [
  ['alpha', 'beta',  'gamma', 'delta',   'epsilon'],
  ['one',   'two',   'three', 'four',    'five'],
  ['a',     'b',     'FREE',  'c',       'd'],
  ['x',     'y',     'z',     'w',       'v'],
  ['foo',   'bar',   'baz',   'qux',     'quux'],
];

function blankMarked(): boolean[][] {
  return Array.from({ length: 5 }, () => Array(5).fill(false));
}

beforeEach(() => resetState());

describe('initial state', () => {
  it('has null playerId', () => expect(state.playerId).toBeNull());
  it('has null grid',     () => expect(state.grid).toBeNull());
  it('has null marked',   () => expect(state.marked).toBeNull());
  it('has gameActive false', () => expect(state.gameActive).toBe(false));
});

describe('resetState', () => {
  it('clears all fields', () => {
    state.playerId = 'p1';
    state.gameActive = true;
    state.grid = WORDS.map(r => [...r]);
    state.marked = blankMarked();
    resetState();
    expect(state.playerId).toBeNull();
    expect(state.gameActive).toBe(false);
    expect(state.grid).toBeNull();
    expect(state.marked).toBeNull();
  });
});

describe('markWordLocally', () => {
  beforeEach(() => {
    state.grid = WORDS.map(r => [...r]);
    state.marked = blankMarked();
  });

  it('marks a matching word', () => {
    markWordLocally('beta');
    expect(state.marked![0][1]).toBe(true);
  });

  it('is case-insensitive', () => {
    markWordLocally('BETA');
    expect(state.marked![0][1]).toBe(true);
  });

  it('strips whitespace before matching', () => {
    markWordLocally('  beta  ');
    expect(state.marked![0][1]).toBe(true);
  });

  it('marks only the first matching cell', () => {
    markWordLocally('alpha');
    const count = state.marked!.flat().filter(Boolean).length;
    expect(count).toBe(1);
    expect(state.marked![0][0]).toBe(true);
  });

  it('does not mark anything for an unrecognised word', () => {
    markWordLocally('notaword');
    expect(state.marked!.flat().some(Boolean)).toBe(false);
  });

  it('is a no-op when grid is null', () => {
    state.grid = null;
    expect(() => markWordLocally('beta')).not.toThrow();
  });

  it('is a no-op when marked is null', () => {
    state.marked = null;
    expect(() => markWordLocally('beta')).not.toThrow();
  });
});
