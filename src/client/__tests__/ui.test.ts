/**
 * @jest-environment jsdom
 */
import {
  show, hide,
  showNotification,
  buildGrid, patchGrid,
  setStatusBar, setRoundIndicator,
  showWinBanner,
  updateLeaderboard,
} from '../ui.js';

const FIXTURE = `
  <div id="notificationArea" class="notification-area hidden"></div>
  <div id="joinSection"       class="hidden"></div>
  <div id="waitingSection"    class="hidden"></div>
  <div id="playingSection"    class="hidden"></div>
  <div id="winBanner"         class="hidden"></div>
  <div id="roundIndicator"></div>
  <div id="statusBar"></div>
  <div id="bingoGrid"></div>
  <div id="leaderboardSection" class="hidden"></div>
  <table><tbody id="leaderboardBody"></tbody></table>
`;

const GRID: string[][] = [
  ['alpha', 'beta',  'gamma', 'delta',   'epsilon'],
  ['one',   'two',   'three', 'four',    'five'],
  ['a',     'b',     'FREE',  'c',       'd'],
  ['x',     'y',     'z',     'w',       'v'],
  ['foo',   'bar',   'baz',   'qux',     'quux'],
];

const BLANK_MARKED: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));

beforeEach(() => {
  document.body.innerHTML = FIXTURE;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
describe('show / hide', () => {
  it('show removes the hidden class', () => {
    show('joinSection');
    expect(document.getElementById('joinSection')!.classList.contains('hidden')).toBe(false);
  });

  it('hide adds the hidden class', () => {
    document.getElementById('joinSection')!.classList.remove('hidden');
    hide('joinSection');
    expect(document.getElementById('joinSection')!.classList.contains('hidden')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('showNotification', () => {
  it('sets the notification text', () => {
    showNotification('something went wrong', 'error');
    expect(document.getElementById('notificationArea')!.textContent).toBe('something went wrong');
  });

  it('applies the given type as a class', () => {
    showNotification('heads up', 'info');
    expect(document.getElementById('notificationArea')!.className).toContain('info');
  });

  it('removes the hidden class immediately', () => {
    showNotification('msg', 'error');
    expect(document.getElementById('notificationArea')!.classList.contains('hidden')).toBe(false);
  });

  it('hides the notification after 4 seconds', () => {
    showNotification('msg', 'error');
    jest.advanceTimersByTime(4000);
    expect(document.getElementById('notificationArea')!.classList.contains('hidden')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('setStatusBar', () => {
  it('sets the status bar text', () => {
    setStatusBar('Mark your words!');
    expect(document.getElementById('statusBar')!.textContent).toBe('Mark your words!');
  });
});

describe('setRoundIndicator', () => {
  it('formats round number as "Round N"', () => {
    setRoundIndicator(3);
    expect(document.getElementById('roundIndicator')!.textContent).toBe('Round 3');
  });
});

describe('showWinBanner', () => {
  it('sets the banner text', () => {
    showWinBanner('Alice won Round 2!');
    expect(document.getElementById('winBanner')!.textContent).toBe('Alice won Round 2!');
  });

  it('makes the banner visible', () => {
    showWinBanner('Alice won Round 2!');
    expect(document.getElementById('winBanner')!.classList.contains('hidden')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('buildGrid', () => {
  it('creates exactly 25 cells', () => {
    buildGrid();
    expect(document.querySelectorAll('#bingoGrid .cell').length).toBe(25);
  });

  it('assigns correct data-row and data-col to each cell', () => {
    buildGrid();
    const cells = document.querySelectorAll<HTMLElement>('#bingoGrid .cell');
    expect(cells[0].dataset.row).toBe('0');
    expect(cells[0].dataset.col).toBe('0');
    expect(cells[7].dataset.row).toBe('1');
    expect(cells[7].dataset.col).toBe('2');
    expect(cells[24].dataset.row).toBe('4');
    expect(cells[24].dataset.col).toBe('4');
  });

  it('replaces any previously built grid', () => {
    buildGrid();
    buildGrid();
    expect(document.querySelectorAll('#bingoGrid .cell').length).toBe(25);
  });
});

// ---------------------------------------------------------------------------
describe('patchGrid', () => {
  beforeEach(() => buildGrid());

  it('sets the text of each cell from the grid', () => {
    patchGrid(GRID, BLANK_MARKED);
    const cells = document.querySelectorAll<HTMLElement>('#bingoGrid .cell');
    expect(cells[0].textContent).toBe('alpha');
    expect(cells[1].textContent).toBe('beta');
    expect(cells[12].textContent).toBe('FREE');
  });

  it('adds the free class to the FREE cell', () => {
    patchGrid(GRID, BLANK_MARKED);
    const cells = document.querySelectorAll<HTMLElement>('#bingoGrid .cell');
    expect(cells[12].classList.contains('free')).toBe(true);
  });

  it('adds the marked class to marked cells', () => {
    const marked = BLANK_MARKED.map(r => [...r]);
    marked[0][1] = true; // 'beta'
    patchGrid(GRID, marked);
    const cells = document.querySelectorAll<HTMLElement>('#bingoGrid .cell');
    expect(cells[1].classList.contains('marked')).toBe(true);
  });

  it('does not add marked class to unmarked cells', () => {
    patchGrid(GRID, BLANK_MARKED);
    const cells = document.querySelectorAll<HTMLElement>('#bingoGrid .cell');
    expect(cells[0].classList.contains('marked')).toBe(false);
  });

  it('removes a previously set marked class when a fresh grid arrives', () => {
    const marked = BLANK_MARKED.map(r => [...r]);
    marked[0][0] = true;
    patchGrid(GRID, marked);
    // Now re-patch with nothing marked (new round)
    patchGrid(GRID, BLANK_MARKED);
    const cells = document.querySelectorAll<HTMLElement>('#bingoGrid .cell');
    expect(cells[0].classList.contains('marked')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('updateLeaderboard', () => {
  const ENTRIES = [
    { screenName: 'Alice', totalPoints: 200, roundsWon: 2 },
    { screenName: 'Bob',   totalPoints: 100, roundsWon: 1 },
  ];

  it('creates one row per entry', () => {
    updateLeaderboard(ENTRIES);
    expect(document.querySelectorAll('#leaderboardBody tr').length).toBe(2);
  });

  it('renders rank, name, points, and rounds correctly', () => {
    updateLeaderboard(ENTRIES);
    const cells = document.querySelectorAll('#leaderboardBody tr')[0].querySelectorAll('td');
    expect(cells[0].textContent).toBe('1');
    expect(cells[1].textContent).toBe('Alice');
    expect(cells[2].textContent).toBe('200');
    expect(cells[3].textContent).toBe('2');
  });

  it('does not inject HTML from player screen names', () => {
    updateLeaderboard([{ screenName: '<img src=x onerror=alert(1)>', totalPoints: 0, roundsWon: 0 }]);
    // Should appear as literal text, not as an element
    const nameTd = document.querySelector('#leaderboardBody td:nth-child(2)')!;
    expect(nameTd.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(document.querySelector('#leaderboardBody img')).toBeNull();
  });

  it('clears previous entries before rendering', () => {
    updateLeaderboard(ENTRIES);
    updateLeaderboard([ENTRIES[0]]);
    expect(document.querySelectorAll('#leaderboardBody tr').length).toBe(1);
  });
});
