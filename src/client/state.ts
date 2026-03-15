export interface GameState {
  playerId: string | null;
  notifTimer: ReturnType<typeof setTimeout> | null;
}

export const state: GameState = {
  playerId: null,
  notifTimer: null,
};

export function resetState(): void {
  state.playerId = null;
  if (state.notifTimer !== null) {
    clearTimeout(state.notifTimer);
    state.notifTimer = null;
  }
}
