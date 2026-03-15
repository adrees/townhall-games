import { state } from './state.js';
import { show, hide, showNotification } from './ui.js';
export const handlers = {
    joined(msg) {
        state.playerId = msg.playerId;
        hide('joinSection');
        show('waitingSection');
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
