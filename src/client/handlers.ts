import { state, markWordLocally } from './state.js';
import {
  show, hide,
  showNotification,
  buildGrid, patchGrid,
  setStatusBar, setRoundIndicator,
  showWinBanner,
  updateLeaderboard,
  type LeaderboardEntry,
} from './ui.js';

type ServerMessage = { type: string; [key: string]: unknown };

export const handlers: Record<string, (msg: ServerMessage) => void> = {
  joined(msg) {
    state.playerId = msg.playerId as string;
    hide('joinSection');
    if (msg.gameStatus === 'active') {
      show('playingSection');
    } else {
      show('waitingSection');
    }
    show('leaderboardSection');
  },

  card_dealt(msg) {
    state.grid   = msg.grid   as string[][];
    state.marked = msg.marked as boolean[][];
    state.gameActive = true;
    hide('waitingSection');
    hide('winBanner');
    show('playingSection');
    setRoundIndicator(msg.roundNumber as number);
    setStatusBar('Mark your words!');
    buildGrid();
    patchGrid(state.grid, state.marked);
  },

  mark_result(msg) {
    if (msg.success) {
      markWordLocally(msg.word as string);
      patchGrid(state.grid!, state.marked!);
    }
    if (msg.bingo) {
      setStatusBar('BINGO! You won!');
      state.gameActive = false;
    } else if (msg.roundOver) {
      setStatusBar('Round over!');
      state.gameActive = false;
    }
  },

  player_won(msg) {
    showWinBanner(`${msg.winnerName as string} won Round ${msg.roundNumber as number}!`);
    state.gameActive = false;
    setStatusBar('Round over - waiting for next round');
  },

  game_status(msg) {
    if (msg.status === 'active') {
      setStatusBar('Mark your words!');
    } else if (msg.status === 'finished') {
      setStatusBar('Round over - waiting for next round');
    }
  },

  leaderboard(msg) {
    updateLeaderboard(msg.entries as LeaderboardEntry[]);
  },

  error(msg) {
    showNotification(`Error: ${msg.message as string}`, 'error');
  },
};

export function handleMessage(msg: ServerMessage): void {
  const handler = handlers[msg.type];
  if (handler) handler(msg);
}
