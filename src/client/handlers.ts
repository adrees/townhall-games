import { state } from './state.js';
import { show, hide, showNotification } from './ui.js';

type ServerMessage = { type: string; [key: string]: unknown };

export const handlers: Record<string, (msg: ServerMessage) => void> = {
  joined(msg) {
    state.playerId = msg.playerId as string;
    hide('joinSection');
    show('waitingSection');
  },

  error(msg) {
    showNotification(`Error: ${msg.message as string}`, 'error');
  },
};

export function handleMessage(msg: ServerMessage): void {
  const handler = handlers[msg.type];
  if (handler) handler(msg);
}
