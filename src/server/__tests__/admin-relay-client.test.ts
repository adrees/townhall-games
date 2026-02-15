import { createAdminRelayClient, type AdminRelayClient } from '../admin-relay-client';
import { EventEmitter } from 'events';

// Mock WebSocket class that simulates the ws library's WebSocket
class MockWs extends EventEmitter {
  sent: string[] = [];
  readyState = 1;
  OPEN = 1;
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
    // Simulate async open
    setTimeout(() => this.emit('open'), 0);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3; // CLOSED
    this.emit('close');
  }

  lastMessage(): Record<string, unknown> | null {
    if (this.sent.length === 0) return null;
    return JSON.parse(this.sent[this.sent.length - 1]);
  }

  allMessages(): Record<string, unknown>[] {
    return this.sent.map((s) => JSON.parse(s));
  }

  clearSent(): void {
    this.sent = [];
  }

  // Simulate receiving a message from server
  receive(data: object): void {
    this.emit('message', Buffer.from(JSON.stringify(data)));
  }
}

describe('AdminRelayClient', () => {
  let client: AdminRelayClient;
  let mockWs: MockWs;
  let onPlayerCommand: jest.Mock;
  let onPlayerConnected: jest.Mock;
  let onPlayerDisconnected: jest.Mock;
  let onPlayerRoster: jest.Mock;
  let onStatusChange: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    onPlayerCommand = jest.fn();
    onPlayerConnected = jest.fn();
    onPlayerDisconnected = jest.fn();
    onPlayerRoster = jest.fn();
    onStatusChange = jest.fn();

    // Create client with a WebSocket factory that returns our mock
    client = createAdminRelayClient({
      onPlayerCommand,
      onPlayerConnected,
      onPlayerDisconnected,
      onPlayerRoster,
      onStatusChange,
      wsFactory: (url: string) => {
        mockWs = new MockWs(url);
        return mockWs as any;
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function connectAndRegister(): void {
    client.connect('wss://relay.example.com', 'sess-1', 'my-secret');
    jest.runAllTimers(); // triggers 'open' event
    mockWs.receive({ envelope: 'admin_registered', sessionId: 'sess-1' });
  }

  describe('connect', () => {
    it('sends admin_register on WebSocket open', () => {
      client.connect('wss://relay.example.com', 'sess-1', 'my-secret');
      jest.runAllTimers();

      const msg = mockWs.lastMessage();
      expect(msg?.envelope).toBe('admin_register');
      expect(msg?.sessionId).toBe('sess-1');
      expect(msg?.secret).toBe('my-secret');
    });

    it('transitions to connecting then connected', () => {
      expect(client.getStatus()).toBe('disconnected');

      client.connect('wss://relay.example.com', 'sess-1', 'my-secret');
      expect(client.getStatus()).toBe('connecting');

      jest.runAllTimers();
      mockWs.receive({ envelope: 'admin_registered', sessionId: 'sess-1' });
      expect(client.getStatus()).toBe('connected');
    });

    it('calls onStatusChange callback', () => {
      client.connect('wss://relay.example.com', 'sess-1', 'my-secret');
      expect(onStatusChange).toHaveBeenCalledWith('connecting');

      jest.runAllTimers();
      mockWs.receive({ envelope: 'admin_registered', sessionId: 'sess-1' });
      expect(onStatusChange).toHaveBeenCalledWith('connected');
    });
  });

  describe('receiving upstream messages', () => {
    it('calls onPlayerCommand for upstream envelope', () => {
      connectAndRegister();

      mockWs.receive({ envelope: 'upstream', connectionId: 'c1', command: '{"type":"join","screenName":"Alice"}' });
      expect(onPlayerCommand).toHaveBeenCalledWith('c1', '{"type":"join","screenName":"Alice"}');
    });

    it('calls onPlayerConnected for player_connected envelope', () => {
      connectAndRegister();

      mockWs.receive({ envelope: 'player_connected', connectionId: 'c1' });
      expect(onPlayerConnected).toHaveBeenCalledWith('c1');
    });

    it('calls onPlayerDisconnected for player_disconnected envelope', () => {
      connectAndRegister();

      mockWs.receive({ envelope: 'player_disconnected', connectionId: 'c1' });
      expect(onPlayerDisconnected).toHaveBeenCalledWith('c1');
    });

    it('calls onPlayerRoster for player_roster envelope', () => {
      connectAndRegister();

      mockWs.receive({ envelope: 'player_roster', connections: ['c1', 'c2'] });
      expect(onPlayerRoster).toHaveBeenCalledWith(['c1', 'c2']);
    });
  });

  describe('sending downstream', () => {
    it('sendToPlayer sends downstream envelope', () => {
      connectAndRegister();
      mockWs.clearSent();

      client.sendToPlayer('c1', '{"type":"joined"}');
      const msg = mockWs.lastMessage();
      expect(msg?.envelope).toBe('downstream');
      expect(msg?.target).toBe('c1');
      expect(msg?.event).toBe('{"type":"joined"}');
    });

    it('broadcastToPlayers sends broadcast envelope', () => {
      connectAndRegister();
      mockWs.clearSent();

      client.broadcastToPlayers('{"type":"game_status"}');
      const msg = mockWs.lastMessage();
      expect(msg?.envelope).toBe('broadcast');
      expect(msg?.event).toBe('{"type":"game_status"}');
    });

    it('does not send when disconnected', () => {
      // Don't connect — should not throw
      client.sendToPlayer('c1', '{"type":"joined"}');
      client.broadcastToPlayers('{"type":"game_status"}');
      // No mock created, so no error thrown
    });
  });

  describe('disconnect and reconnect', () => {
    it('sets status to disconnected on close', () => {
      connectAndRegister();
      expect(client.getStatus()).toBe('connected');

      mockWs.close();
      expect(client.getStatus()).toBe('disconnected');
      expect(onStatusChange).toHaveBeenCalledWith('disconnected');
    });

    it('auto-reconnects after disconnect', () => {
      connectAndRegister();
      const firstWs = mockWs;
      firstWs.close();

      // Advance past reconnect delay
      jest.advanceTimersByTime(3000);
      expect(mockWs).not.toBe(firstWs); // New WS created
      expect(client.getStatus()).toBe('connecting');
    });

    it('disconnect() stops auto-reconnect', () => {
      connectAndRegister();
      client.disconnect();
      expect(client.getStatus()).toBe('disconnected');

      // Advance time — should not create new WS
      const wsAfterDisconnect = mockWs;
      jest.advanceTimersByTime(10000);
      expect(mockWs).toBe(wsAfterDisconnect);
    });
  });
});
