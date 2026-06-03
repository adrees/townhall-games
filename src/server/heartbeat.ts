import { WebSocket, WebSocketServer } from 'ws';

const PING_INTERVAL_MS = 30_000;

interface AliveSocket extends WebSocket {
  isAlive: boolean;
}

/**
 * Attaches a ping/pong heartbeat to a WebSocketServer.
 * Pings all connected clients every 30s. Clients that do not respond
 * with a pong before the next ping are terminated.
 * Returns the interval handle so callers can clear it on shutdown.
 */
export function attachHeartbeat(wss: WebSocketServer): ReturnType<typeof setInterval> {
  wss.on('connection', (ws: WebSocket) => {
    const socket = ws as AliveSocket;
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });
  });

  return setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      const socket = ws as AliveSocket;
      if (socket.isAlive === false) {
        socket.terminate();
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, PING_INTERVAL_MS);
}
