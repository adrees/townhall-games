/**
 * @jest-environment jsdom
 */

// Mock the UI module so handler tests don't need real DOM elements.
jest.mock('../ui.js', () => ({
  show:              jest.fn(),
  hide:              jest.fn(),
  showNotification:  jest.fn(),
  buildGrid:         jest.fn(),
  patchGrid:         jest.fn(),
  setStatusBar:      jest.fn(),
  setRoundIndicator: jest.fn(),
  showWinBanner:     jest.fn(),
  updateLeaderboard: jest.fn(),
}));

import { state, resetState } from '../state.js';
import { handlers, handleMessage } from '../handlers.js';
import * as ui from '../ui.js';

const mockUi = ui as jest.Mocked<typeof ui>;

const GRID: string[][] = [
  ['alpha', 'beta',  'gamma', 'delta',   'epsilon'],
  ['one',   'two',   'three', 'four',    'five'],
  ['a',     'b',     'FREE',  'c',       'd'],
  ['x',     'y',     'z',     'w',       'v'],
  ['foo',   'bar',   'baz',   'qux',     'quux'],
];

const BLANK_MARKED: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));

beforeEach(() => {
  resetState();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe('joined', () => {
  it('stores playerId in state', () => {
    handlers.joined({ type: 'joined', playerId: 'p1', gameStatus: 'waiting', round: 1 });
    expect(state.playerId).toBe('p1');
  });

  it('hides the join section', () => {
    handlers.joined({ type: 'joined', playerId: 'p1', gameStatus: 'waiting', round: 1 });
    expect(mockUi.hide).toHaveBeenCalledWith('joinSection');
  });

  it('shows waitingSection when game is not yet active', () => {
    handlers.joined({ type: 'joined', playerId: 'p1', gameStatus: 'waiting', round: 1 });
    expect(mockUi.show).toHaveBeenCalledWith('waitingSection');
  });

  it('shows playingSection for a late joiner (game already active)', () => {
    handlers.joined({ type: 'joined', playerId: 'p2', gameStatus: 'active', round: 2 });
    expect(mockUi.show).toHaveBeenCalledWith('playingSection');
  });

  it('always shows leaderboard', () => {
    handlers.joined({ type: 'joined', playerId: 'p1', gameStatus: 'waiting', round: 1 });
    expect(mockUi.show).toHaveBeenCalledWith('leaderboardSection');
  });
});

// ---------------------------------------------------------------------------
describe('card_dealt', () => {
  it('stores grid and marked in state', () => {
    handlers.card_dealt({ type: 'card_dealt', grid: GRID, marked: BLANK_MARKED, roundNumber: 1 });
    expect(state.grid).toEqual(GRID);
    expect(state.marked).toEqual(BLANK_MARKED);
  });

  it('sets gameActive to true', () => {
    handlers.card_dealt({ type: 'card_dealt', grid: GRID, marked: BLANK_MARKED, roundNumber: 1 });
    expect(state.gameActive).toBe(true);
  });

  it('hides waitingSection and winBanner', () => {
    handlers.card_dealt({ type: 'card_dealt', grid: GRID, marked: BLANK_MARKED, roundNumber: 1 });
    expect(mockUi.hide).toHaveBeenCalledWith('waitingSection');
    expect(mockUi.hide).toHaveBeenCalledWith('winBanner');
  });

  it('calls buildGrid then patchGrid', () => {
    handlers.card_dealt({ type: 'card_dealt', grid: GRID, marked: BLANK_MARKED, roundNumber: 1 });
    expect(mockUi.buildGrid).toHaveBeenCalled();
    expect(mockUi.patchGrid).toHaveBeenCalledWith(GRID, BLANK_MARKED);
  });

  it('sets the round indicator', () => {
    handlers.card_dealt({ type: 'card_dealt', grid: GRID, marked: BLANK_MARKED, roundNumber: 3 });
    expect(mockUi.setRoundIndicator).toHaveBeenCalledWith(3);
  });

  it('resets status bar text', () => {
    handlers.card_dealt({ type: 'card_dealt', grid: GRID, marked: BLANK_MARKED, roundNumber: 1 });
    expect(mockUi.setStatusBar).toHaveBeenCalledWith('Mark your words!');
  });
});

// ---------------------------------------------------------------------------
describe('mark_result', () => {
  beforeEach(() => {
    state.grid = GRID.map(r => [...r]);
    state.marked = BLANK_MARKED.map(r => [...r]);
    state.gameActive = true;
  });

  it('marks the word in state and re-patches the grid on success', () => {
    handlers.mark_result({ type: 'mark_result', success: true, word: 'beta', bingo: false, roundOver: false });
    expect(state.marked![0][1]).toBe(true);
    expect(mockUi.patchGrid).toHaveBeenCalled();
  });

  it('does not update state or patch grid on failure', () => {
    handlers.mark_result({ type: 'mark_result', success: false, word: 'beta', bingo: false, roundOver: false });
    expect(state.marked![0][1]).toBe(false);
    expect(mockUi.patchGrid).not.toHaveBeenCalled();
  });

  it('shows bingo message and ends game when bingo is true', () => {
    handlers.mark_result({ type: 'mark_result', success: true, word: 'beta', bingo: true, roundOver: true });
    expect(mockUi.setStatusBar).toHaveBeenCalledWith('BINGO! You won!');
    expect(state.gameActive).toBe(false);
  });

  it('shows round-over message when roundOver but not bingo', () => {
    handlers.mark_result({ type: 'mark_result', success: true, word: 'beta', bingo: false, roundOver: true });
    expect(mockUi.setStatusBar).toHaveBeenCalledWith('Round over!');
    expect(state.gameActive).toBe(false);
  });

  it('leaves game active when neither bingo nor roundOver', () => {
    handlers.mark_result({ type: 'mark_result', success: true, word: 'beta', bingo: false, roundOver: false });
    expect(state.gameActive).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('player_won', () => {
  it('shows win banner with winner name and round number', () => {
    handlers.player_won({ type: 'player_won', winnerName: 'Alice', roundNumber: 2 });
    expect(mockUi.showWinBanner).toHaveBeenCalledWith('Alice won Round 2!');
  });

  it('deactivates the game', () => {
    state.gameActive = true;
    handlers.player_won({ type: 'player_won', winnerName: 'Bob', roundNumber: 1 });
    expect(state.gameActive).toBe(false);
  });

  it('updates status bar', () => {
    handlers.player_won({ type: 'player_won', winnerName: 'Alice', roundNumber: 1 });
    expect(mockUi.setStatusBar).toHaveBeenCalledWith('Round over - waiting for next round');
  });
});

// ---------------------------------------------------------------------------
describe('game_status', () => {
  it('sets status bar to active text when game becomes active', () => {
    handlers.game_status({ type: 'game_status', status: 'active' });
    expect(mockUi.setStatusBar).toHaveBeenCalledWith('Mark your words!');
  });

  it('sets status bar to waiting text when game finishes', () => {
    handlers.game_status({ type: 'game_status', status: 'finished' });
    expect(mockUi.setStatusBar).toHaveBeenCalledWith('Round over - waiting for next round');
  });
});

// ---------------------------------------------------------------------------
describe('leaderboard', () => {
  it('delegates directly to updateLeaderboard', () => {
    const entries = [{ screenName: 'Alice', totalPoints: 100, roundsWon: 1 }];
    handlers.leaderboard({ type: 'leaderboard', entries });
    expect(mockUi.updateLeaderboard).toHaveBeenCalledWith(entries);
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
    const entries = [{ screenName: 'Alice', totalPoints: 100, roundsWon: 1 }];
    handleMessage({ type: 'leaderboard', entries });
    expect(mockUi.updateLeaderboard).toHaveBeenCalledWith(entries);
  });

  it('is a no-op for unknown message types', () => {
    expect(() => handleMessage({ type: 'surprise_new_type' })).not.toThrow();
  });
});
