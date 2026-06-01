import { connect, send } from './ws-client.js';
import { handleMessage } from './handlers.js';
import { showNotification } from './ui.js';
import { triviaHandlers, initAnswerButtons, initRejoinButton } from './trivia-handlers.js';
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
// --- Combined message handler (trivia first, shared fallback) --------------
function combinedHandler(msg) {
    const triviaHandler = triviaHandlers[msg.type];
    if (triviaHandler) {
        triviaHandler(msg);
        return;
    }
    handleMessage(msg);
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
initRejoinButton();
