import WebSocket from 'ws';
import { parseRelayMessage, serializeRelayMessage } from '../relay/relay-protocol';

export type RelayStatus = 'disconnected' | 'connecting' | 'connected';

export interface AdminRelayClientOptions {
  onPlayerCommand: (connectionId: string, rawCommand: string) => void;
  onPlayerConnected: (connectionId: string) => void;
  onPlayerDisconnected: (connectionId: string) => void;
  onPlayerRoster: (connections: string[]) => void;
  onStatusChange: (status: RelayStatus) => void;
  wsFactory?: (url: string) => WebSocket;
}

export interface AdminRelayClient {
  connect(relayUrl: string, sessionId: string, secret: string): void;
  disconnect(): void;
  getStatus(): RelayStatus;
  sendToPlayer(connectionId: string, event: string): void;
  broadcastToPlayers(event: string): void;
}

export function createAdminRelayClient(opts: AdminRelayClientOptions): AdminRelayClient {
  let ws: WebSocket | null = null;
  let status: RelayStatus = 'disconnected';
  let shouldReconnect = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let connectArgs: { relayUrl: string; sessionId: string; secret: string } | null = null;

  const createWs = opts.wsFactory ?? ((url: string) => new WebSocket(url));

  function setStatus(newStatus: RelayStatus): void {
    status = newStatus;
    opts.onStatusChange(newStatus);
  }

  function doConnect(relayUrl: string, sessionId: string, secret: string): void {
    connectArgs = { relayUrl, sessionId, secret };
    shouldReconnect = true;
    setStatus('connecting');

    ws = createWs(relayUrl);

    ws.on('open', () => {
      ws!.send(serializeRelayMessage({
        envelope: 'admin_register',
        sessionId,
        secret,
      }));
    });

    ws.on('message', (data: WebSocket.RawData) => {
      const msg = parseRelayMessage(data.toString());
      if (!msg) return;

      switch (msg.envelope) {
        case 'admin_registered':
          setStatus('connected');
          break;
        case 'upstream':
          opts.onPlayerCommand(msg.connectionId, msg.command);
          break;
        case 'player_connected':
          opts.onPlayerConnected(msg.connectionId);
          break;
        case 'player_disconnected':
          opts.onPlayerDisconnected(msg.connectionId);
          break;
        case 'player_roster':
          opts.onPlayerRoster(msg.connections);
          break;
      }
    });

    ws.on('close', () => {
      ws = null;
      setStatus('disconnected');
      if (shouldReconnect && connectArgs) {
        const args = connectArgs;
        reconnectTimer = setTimeout(() => {
          doConnect(args.relayUrl, args.sessionId, args.secret);
        }, 3000);
      }
    });
  }

  return {
    connect(relayUrl: string, sessionId: string, secret: string): void {
      doConnect(relayUrl, sessionId, secret);
    },

    disconnect(): void {
      shouldReconnect = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws) {
        ws.close();
        ws = null;
      }
      setStatus('disconnected');
    },

    getStatus(): RelayStatus {
      return status;
    },

    sendToPlayer(connectionId: string, event: string): void {
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(serializeRelayMessage({
          envelope: 'downstream',
          target: connectionId,
          event,
        }));
      }
    },

    broadcastToPlayers(event: string): void {
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(serializeRelayMessage({
          envelope: 'broadcast',
          event,
        }));
      }
    },
  };
}
