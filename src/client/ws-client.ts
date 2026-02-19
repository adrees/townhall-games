type MessageHandler = (msg: { type: string; [key: string]: unknown }) => void;

let ws: WebSocket | null = null;
let onMessage: MessageHandler | null = null;

export function connect(handler: MessageHandler): void {
  onMessage = handler;
  openConnection();
}

function openConnection(): void {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(protocol + '//' + location.host);

  ws.onmessage = function (e: MessageEvent) {
    if (onMessage) {
      onMessage(JSON.parse(e.data as string) as { type: string; [key: string]: unknown });
    }
  };

  ws.onclose = function () {
    setTimeout(openConnection, 2000);
  };
}

export function send(message: Record<string, unknown>): void {
  if (ws) {
    ws.send(JSON.stringify(message));
  }
}
