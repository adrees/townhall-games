import { connect, send } from './ws-client.js';
import { handleMessage } from './handlers.js';
import { showNotification } from './ui.js';
import { state } from './state.js';

// --- Join form -----------------------------------------------------------

function joinGame(): void {
  const input = document.getElementById('screenName') as HTMLInputElement;
  const name = input.value.trim();
  if (!name) {
    showNotification('Please enter a screen name', 'error');
    return;
  }
  send({ type: 'join', screenName: name });
}

document.getElementById('joinBtn')!
  .addEventListener('click', joinGame);

document.getElementById('screenName')!
  .addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') joinGame();
  });

// --- Grid click (event delegation) ----------------------------------------
// A single listener on the grid container handles all cell clicks.
// This never needs to be re-attached when the grid is rebuilt.

document.getElementById('bingoGrid')!
  .addEventListener('click', (e: MouseEvent) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.cell');
    if (
      !cell ||
      !state.gameActive ||
      cell.classList.contains('free') ||
      cell.classList.contains('marked')
    ) return;
    const r = Number(cell.dataset.row);
    const c = Number(cell.dataset.col);
    if (state.grid) {
      send({ type: 'mark_word', word: state.grid[r][c] });
    }
  });

// --- Start connection -------------------------------------------------------

connect(handleMessage);
