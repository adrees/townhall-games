import * as http from 'http';
import * as path from 'path';
import { WebSocketServer } from 'ws';
import { handleStaticRequest } from '../server/http-server';
import { createRelayHandler } from './relay-handler';

const PORT = parseInt(process.env.PORT ?? '10000', 10);
const RELAY_SECRET = process.env.RELAY_SECRET ?? '';
const PUBLIC_DIR = path.resolve(__dirname, '../../public');

if (!RELAY_SECRET) {
  console.error('RELAY_SECRET environment variable is required');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  handleStaticRequest(req, res, PUBLIC_DIR, 'relay');
});

const wss = new WebSocketServer({ server });
const relay = createRelayHandler(RELAY_SECRET);

wss.on('connection', (ws, req) => {
  const url = req.url ?? '/';
  if (url === '/admin') {
    relay.handleAdminConnection(ws);
  } else {
    relay.handlePlayerConnection(ws);
  }
});

server.listen(PORT, () => {
  console.log(`Relay server running on port ${PORT}`);
  console.log(`Player page: http://localhost:${PORT}/`);
  console.log(`Admin connects to: ws://localhost:${PORT}/admin`);
});
