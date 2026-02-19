export interface GameState {
  playerId: string | null;
  grid: string[][] | null;
  marked: boolean[][] | null;
  gameActive: boolean;
  notifTimer: ReturnType<typeof setTimeout> | null;
}

export const state: GameState = {
  playerId: null,
  grid: null,
  marked: null,
  gameActive: false,
  notifTimer: null,
};

export function resetState(): void {
  state.playerId = null;
  state.grid = null;
  state.marked = null;
  state.gameActive = false;
  if (state.notifTimer !== null) {
    clearTimeout(state.notifTimer);
    state.notifTimer = null;
  }
}

export function markWordLocally(word: string): void {
  if (!state.grid || !state.marked) return;
  const lower = word.trim().toLowerCase();
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (state.grid[r][c].toLowerCase() === lower) {
        state.marked[r][c] = true;
        return;
      }
    }
  }
}
