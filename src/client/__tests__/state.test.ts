import { state, resetState } from '../state.js';

beforeEach(() => resetState());

describe('initial state', () => {
  it('has null playerId', () => expect(state.playerId).toBeNull());
  it('has null notifTimer', () => expect(state.notifTimer).toBeNull());
});

describe('resetState', () => {
  it('clears playerId', () => {
    state.playerId = 'p1';
    resetState();
    expect(state.playerId).toBeNull();
  });
});
