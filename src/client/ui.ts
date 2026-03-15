function el(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element #${id} not found in DOM`);
  return element;
}

export function show(id: string): void {
  el(id).classList.remove('hidden');
}

export function hide(id: string): void {
  el(id).classList.add('hidden');
}

export function showNotification(message: string, type: string = 'error'): void {
  const area = el('notificationArea');
  area.textContent = message;
  area.className = 'notification-area ' + type;
  setTimeout(() => area.classList.add('hidden'), 4000);
}
