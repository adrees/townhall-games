let ws = null;
let onMessage = null;
let onOpenCallback = null;
export function connect(handler, onOpen) {
    onMessage = handler;
    onOpenCallback = onOpen ?? null;
    openConnection();
}
function openConnection() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(protocol + '//' + location.host);
    ws.onopen = function () {
        if (onOpenCallback)
            onOpenCallback();
    };
    ws.onmessage = function (e) {
        if (onMessage) {
            onMessage(JSON.parse(e.data));
        }
    };
    ws.onclose = function () {
        setTimeout(openConnection, 2000);
    };
}
export function send(message) {
    if (ws) {
        ws.send(JSON.stringify(message));
    }
}
