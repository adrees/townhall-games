import { randomUUID } from 'crypto';
import type WebSocket from 'ws';
import { parseRelayMessage } from './relay-protocol';
import type { RelayMessage } from './relay-protocol';

export interface RelayHandler {
  handleAdminConnection(ws: WebSocket): void;
  handlePlayerConnection(ws: WebSocket): void;
}

export function createRelayHandler(secret: string): RelayHandler {
  let adminWs: WebSocket | null = null;
  let adminRegistered = false;
  const playerConnections = new Map<string, WebSocket>();
  const wsToConnectionId = new Map<WebSocket, string>();

  function sendToAdmin(msg: RelayMessage): void {
    if (adminWs && adminWs.readyState === adminWs.OPEN) {
      adminWs.send(JSON.stringify(msg));
    }
  }

  function sendToPlayer(ws: WebSocket, data: string): void {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    } catch {
      // Swallow
    }
  }

  function handleAdminMessage(raw: string): void {
    const msg = parseRelayMessage(raw);
    if (!msg) return;

    if (!adminRegistered) {
      if (msg.envelope !== 'admin_register') {
        sendToAdmin({ envelope: 'admin_error', message: 'Must register first' });
        return;
      }
      if (msg.secret !== secret) {
        sendToAdmin({ envelope: 'admin_error', message: 'Invalid secret' });
        return;
      }
      adminRegistered = true;
      sendToAdmin({ envelope: 'admin_registered', sessionId: msg.sessionId });
      // Send roster of existing player connections
      if (playerConnections.size > 0) {
        sendToAdmin({
          envelope: 'player_roster',
          connections: Array.from(playerConnections.keys()),
        });
      }
      return;
    }

    switch (msg.envelope) {
      case 'downstream': {
        const playerWs = playerConnections.get(msg.target);
        if (playerWs) {
          sendToPlayer(playerWs, msg.event);
        }
        break;
      }
      case 'broadcast': {
        for (const ws of playerConnections.values()) {
          sendToPlayer(ws, msg.event);
        }
        break;
      }
    }
  }

  return {
    handleAdminConnection(ws: WebSocket): void {
      // Reject if admin already connected
      if (adminWs && adminWs.readyState === adminWs.OPEN) {
        ws.send(JSON.stringify({ envelope: 'admin_error', message: 'Admin already connected' }));
        return;
      }

      adminWs = ws;
      adminRegistered = false;

      ws.on('message', (data: WebSocket.RawData) => {
        handleAdminMessage(data.toString());
      });

      ws.on('close', () => {
        if (ws === adminWs) {
          adminWs = null;
          adminRegistered = false;
          // Notify all players
          const errorEvent = JSON.stringify({ type: 'error', message: 'Game host disconnected. Reconnecting...' });
          for (const playerWs of playerConnections.values()) {
            sendToPlayer(playerWs, errorEvent);
          }
        }
      });
    },

    handlePlayerConnection(ws: WebSocket): void {
      if (!adminWs || !adminRegistered) {
        ws.send(JSON.stringify({ type: 'error', message: 'Game session not available yet. Please try again shortly.' }));
        return;
      }

      const connectionId = randomUUID();
      playerConnections.set(connectionId, ws);
      wsToConnectionId.set(ws, connectionId);

      sendToAdmin({ envelope: 'player_connected', connectionId });

      ws.on('message', (data: WebSocket.RawData) => {
        sendToAdmin({
          envelope: 'upstream',
          connectionId,
          command: data.toString(),
        });
      });

      ws.on('close', () => {
        playerConnections.delete(connectionId);
        wsToConnectionId.delete(ws);
        sendToAdmin({
          envelope: 'player_disconnected',
          connectionId,
        });
      });
    },
  };
}
