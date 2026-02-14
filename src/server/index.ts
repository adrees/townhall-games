import * as http from 'http';
import * as path from 'path';
import { WebSocketServer } from 'ws';
import { handleStaticRequest } from './http-server';
import { createWsHandler } from './ws-handler';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const PUBLIC_DIR = path.resolve(__dirname, '../../public');

const server = http.createServer((req, res) => {
  handleStaticRequest(req, res, PUBLIC_DIR);
});

const wss = new WebSocketServer({ server });
const wsHandler = createWsHandler();

wss.on('connection', (ws) => {
  wsHandler.handleConnection(ws);
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin page: http://localhost:${PORT}/admin`);
  console.log(`Player page: http://localhost:${PORT}/`);
});
