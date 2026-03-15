function el(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Element #${id} not found in DOM`);
    return element;
}
export function show(id) {
    el(id).classList.remove('hidden');
}
export function hide(id) {
    el(id).classList.add('hidden');
}
export function showNotification(message, type = 'error') {
    const area = el('notificationArea');
    area.textContent = message;
    area.className = 'notification-area ' + type;
    setTimeout(() => area.classList.add('hidden'), 4000);
}
