export const state = {
    playerId: null,
    notifTimer: null,
};
export function resetState() {
    state.playerId = null;
    if (state.notifTimer !== null) {
        clearTimeout(state.notifTimer);
        state.notifTimer = null;
    }
}
