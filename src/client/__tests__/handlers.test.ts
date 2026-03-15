/**
 * @jest-environment jsdom
 */

jest.mock('../ui.js', () => ({
  show:             jest.fn(),
  hide:             jest.fn(),
  showNotification: jest.fn(),
}));

import { state, resetState } from '../state.js';
import { handlers, handleMessage } from '../handlers.js';
import * as ui from '../ui.js';

const mockUi = ui as jest.Mocked<typeof ui>;

beforeEach(() => {
  resetState();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe('joined', () => {
  it('stores playerId in state', () => {
    handlers.joined({ type: 'joined', playerId: 'p1', gameStatus: 'no_game', round: 0 });
    expect(state.playerId).toBe('p1');
  });

  it('hides the join section', () => {
    handlers.joined({ type: 'joined', playerId: 'p1', gameStatus: 'no_game', round: 0 });
    expect(mockUi.hide).toHaveBeenCalledWith('joinSection');
  });

  it('shows waitingSection', () => {
    handlers.joined({ type: 'joined', playerId: 'p1', gameStatus: 'no_game', round: 0 });
    expect(mockUi.show).toHaveBeenCalledWith('waitingSection');
  });
});

// ---------------------------------------------------------------------------
describe('error', () => {
  it('shows an error notification', () => {
    handlers.error({ type: 'error', message: 'session not found' });
    expect(mockUi.showNotification).toHaveBeenCalledWith('Error: session not found', 'error');
  });
});

// ---------------------------------------------------------------------------
describe('handleMessage', () => {
  it('dispatches to the correct handler by type', () => {
    handlers.error({ type: 'error', message: 'test' });
    expect(mockUi.showNotification).toHaveBeenCalledWith('Error: test', 'error');
  });

  it('is a no-op for unknown message types', () => {
    expect(() => handleMessage({ type: 'surprise_new_type' })).not.toThrow();
  });
});
