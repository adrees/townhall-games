import 'dotenv/config';
import * as http from 'http';
import * as path from 'path';
import { WebSocketServer } from 'ws';
import { handleStaticRequest } from './http-server';
import { createAdminWsHandler } from './admin-ws-handler';
import { createAdminRelayClient } from './admin-relay-client';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const RELAY_URL = process.env.RELAY_URL ?? '';
const RELAY_SECRET = process.env.RELAY_SECRET ?? '';
const PUBLIC_DIR = path.resolve(__dirname, '../../public');

const handler = createAdminWsHandler({
  sendToPlayer(connectionId, event) {
    relayClient.sendToPlayer(connectionId, event);
  },
  broadcastToPlayers(event) {
    relayClient.broadcastToPlayers(event);
  },
});

const relayClient = createAdminRelayClient({
  onPlayerCommand(connectionId, rawCommand) {
    handler.handlePlayerCommand(connectionId, rawCommand);
  },
  onPlayerConnected(connectionId) {
    handler.handlePlayerConnected(connectionId);
  },
  onPlayerDisconnected(connectionId) {
    handler.handlePlayerDisconnected(connectionId);
  },
  onPlayerRoster(connections) {
    console.log(`Relay roster: ${connections.length} player(s) connected`);
  },
  onStatusChange(status) {
    console.log(`Relay status: ${status}`);
    // Broadcast relay status to admin UI
    broadcastRelayStatus(status);
  },
});

const server = http.createServer((req, res) => {
  handleStaticRequest(req, res, PUBLIC_DIR, 'admin');
});

const wss = new WebSocketServer({ server });
let adminWs: import('ws').WebSocket | null = null;

function broadcastRelayStatus(status: string): void {
  if (adminWs && adminWs.readyState === adminWs.OPEN) {
    adminWs.send(JSON.stringify({ type: 'relay_status', status }));
  }
}

wss.on('connection', (ws) => {
  adminWs = ws;
  handler.handleAdminConnection(ws);
  // Send current relay status immediately
  ws.send(JSON.stringify({ type: 'relay_status', status: relayClient.getStatus() }));
  ws.on('close', () => {
    if (ws === adminWs) adminWs = null;
  });
});

server.listen(PORT, () => {
  console.log(`Admin server running on http://localhost:${PORT}`);
  console.log(`Admin page: http://localhost:${PORT}/admin`);

  if (RELAY_URL && RELAY_SECRET) {
    console.log(`Connecting to relay at ${RELAY_URL}...`);
    // Use /admin path so relay knows this is the admin connection
    relayClient.connect(`${RELAY_URL}/admin`, 'local-session', RELAY_SECRET);
  } else {
    console.log('No RELAY_URL/RELAY_SECRET set — running in local-only mode');
  }
});
