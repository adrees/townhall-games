import { connect, send } from './ws-client.js';
import { handlers } from './handlers.js';
import { showNotification } from './ui.js';
import { state } from './state.js';
import { triviaHandlers, initAnswerButtons } from './trivia-handlers.js';
// --- Join form -----------------------------------------------------------
function joinGame(name) {
    const screenName = name ?? document.getElementById('screenName').value.trim();
    if (!screenName) {
        showNotification('Please enter a screen name', 'error');
        return;
    }
    send({ type: 'join', screenName });
}
document.getElementById('joinBtn')
    .addEventListener('click', () => joinGame());
document.getElementById('screenName')
    .addEventListener('keydown', (e) => {
    if (e.key === 'Enter')
        joinGame();
});
// --- Grid click (event delegation) ----------------------------------------
// A single listener on the grid container handles all cell clicks.
// This never needs to be re-attached when the grid is rebuilt.
document.getElementById('bingoGrid')
    .addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell ||
        !state.gameActive ||
        cell.classList.contains('free') ||
        cell.classList.contains('marked'))
        return;
    const r = Number(cell.dataset.row);
    const c = Number(cell.dataset.col);
    if (state.grid) {
        send({ type: 'mark_word', word: state.grid[r][c] });
    }
});
// --- Combined message handler (trivia first, bingo fallback) ---------------
function combinedHandler(msg) {
    const triviaHandler = triviaHandlers[msg.type];
    if (triviaHandler) {
        triviaHandler(msg);
        return;
    }
    const bingoHandler = handlers[msg.type];
    if (bingoHandler)
        bingoHandler(msg);
}
// --- Auto-join via query params ---------------------------------------------
function getAutoJoinName() {
    const params = new URLSearchParams(location.search);
    const name = params.get('name');
    return name && name.trim() ? name.trim() : null;
}
const autoJoinName = getAutoJoinName();
// --- Start connection -------------------------------------------------------
connect(combinedHandler, autoJoinName ? () => joinGame(autoJoinName) : undefined);
initAnswerButtons();
