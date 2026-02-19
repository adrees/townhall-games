import { state, markWordLocally } from './state.js';
import { show, hide, showNotification, buildGrid, patchGrid, setStatusBar, setRoundIndicator, showWinBanner, updateLeaderboard, } from './ui.js';
export const handlers = {
    joined(msg) {
        state.playerId = msg.playerId;
        hide('joinSection');
        if (msg.gameStatus === 'active') {
            show('playingSection');
        }
        else {
            show('waitingSection');
        }
        show('leaderboardSection');
    },
    card_dealt(msg) {
        state.grid = msg.grid;
        state.marked = msg.marked;
        state.gameActive = true;
        hide('waitingSection');
        hide('winBanner');
        show('playingSection');
        setRoundIndicator(msg.roundNumber);
        setStatusBar('Mark your words!');
        buildGrid();
        patchGrid(state.grid, state.marked);
    },
    mark_result(msg) {
        if (msg.success) {
            markWordLocally(msg.word);
            patchGrid(state.grid, state.marked);
        }
        if (msg.bingo) {
            setStatusBar('BINGO! You won!');
            state.gameActive = false;
        }
        else if (msg.roundOver) {
            setStatusBar('Round over!');
            state.gameActive = false;
        }
    },
    player_won(msg) {
        showWinBanner(`${msg.winnerName} won Round ${msg.roundNumber}!`);
        state.gameActive = false;
        setStatusBar('Round over - waiting for next round');
    },
    game_status(msg) {
        if (msg.status === 'active') {
            setStatusBar('Mark your words!');
        }
        else if (msg.status === 'finished') {
            setStatusBar('Round over - waiting for next round');
        }
    },
    leaderboard(msg) {
        updateLeaderboard(msg.entries);
    },
    error(msg) {
        showNotification(`Error: ${msg.message}`, 'error');
    },
};
export function handleMessage(msg) {
    const handler = handlers[msg.type];
    if (handler)
        handler(msg);
}
