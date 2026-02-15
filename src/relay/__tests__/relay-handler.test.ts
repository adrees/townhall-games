import { createRelayHandler } from '../relay-handler';
import { EventEmitter } from 'events';

class MockWs extends EventEmitter {
  sent: string[] = [];
  readyState = 1;
  OPEN = 1;

  send(data: string): void {
    this.sent.push(data);
  }

  receive(data: object): void {
    this.emit('message', Buffer.from(JSON.stringify(data)));
  }

  simulateClose(): void {
    this.emit('close');
  }

  lastMessage(): Record<string, unknown> | null {
    if (this.sent.length === 0) return null;
    return JSON.parse(this.sent[this.sent.length - 1]);
  }

  allMessages(): Record<string, unknown>[] {
    return this.sent.map((s) => JSON.parse(s));
  }

  messagesOfEnvelope(envelope: string): Record<string, unknown>[] {
    return this.allMessages().filter((m) => m.envelope === envelope);
  }

  clearSent(): void {
    this.sent = [];
  }
}

const SECRET = 'test-secret';

describe('RelayHandler', () => {
  let handler: ReturnType<typeof createRelayHandler>;
  let adminWs: MockWs;
  let playerWs: MockWs;

  beforeEach(() => {
    handler = createRelayHandler(SECRET);
    adminWs = new MockWs();
    playerWs = new MockWs();
  });

  function registerAdmin(sessionId = 'sess-1'): void {
    handler.handleAdminConnection(adminWs as any);
    adminWs.receive({ envelope: 'admin_register', sessionId, secret: SECRET });
  }

  function connectPlayer(): string {
    handler.handlePlayerConnection(playerWs as any);
    // After connecting, admin should receive player_connected
    const msgs = adminWs.messagesOfEnvelope('player_connected');
    const msg = msgs[msgs.length - 1];
    return msg?.connectionId as string;
  }

  describe('admin registration', () => {
    it('confirms registration with correct secret', () => {
      registerAdmin('sess-1');
      const msg = adminWs.lastMessage();
      expect(msg?.envelope).toBe('admin_registered');
      expect(msg?.sessionId).toBe('sess-1');
    });

    it('rejects registration with wrong secret', () => {
      handler.handleAdminConnection(adminWs as any);
      adminWs.receive({ envelope: 'admin_register', sessionId: 'sess-1', secret: 'wrong' });
      const msg = adminWs.lastMessage();
      expect(msg?.envelope).toBe('admin_error');
      expect(msg?.message).toContain('secret');
    });

    it('rejects non-register messages before registration', () => {
      handler.handleAdminConnection(adminWs as any);
      adminWs.receive({ envelope: 'downstream', target: 'c1', event: '{}' });
      const msg = adminWs.lastMessage();
      expect(msg?.envelope).toBe('admin_error');
    });
  });

  describe('player connections', () => {
    it('notifies admin when a player connects', () => {
      registerAdmin();
      adminWs.clearSent();

      handler.handlePlayerConnection(playerWs as any);
      const msg = adminWs.lastMessage();
      expect(msg?.envelope).toBe('player_connected');
      expect(typeof msg?.connectionId).toBe('string');
    });

    it('sends error to player if no admin is connected', () => {
      handler.handlePlayerConnection(playerWs as any);
      const msg = playerWs.lastMessage();
      expect(msg?.type).toBe('error');
      expect((msg?.message as string).toLowerCase()).toContain('not available');
    });

    it('notifies admin when a player disconnects', () => {
      registerAdmin();
      const connId = connectPlayer();
      adminWs.clearSent();

      playerWs.simulateClose();
      const msg = adminWs.lastMessage();
      expect(msg?.envelope).toBe('player_disconnected');
      expect(msg?.connectionId).toBe(connId);
    });
  });

  describe('upstream forwarding (player → admin)', () => {
    it('forwards player commands to admin with connectionId', () => {
      registerAdmin();
      const connId = connectPlayer();
      adminWs.clearSent();

      playerWs.receive({ type: 'join', screenName: 'Alice' });
      const msg = adminWs.lastMessage();
      expect(msg?.envelope).toBe('upstream');
      expect(msg?.connectionId).toBe(connId);
      const command = JSON.parse(msg?.command as string);
      expect(command.type).toBe('join');
      expect(command.screenName).toBe('Alice');
    });

    it('does not forward if admin disconnected', () => {
      registerAdmin();
      connectPlayer();
      adminWs.simulateClose();
      adminWs.clearSent();

      // Player sends a command — should not throw, just silently drop
      playerWs.receive({ type: 'mark_word', word: 'synergy' });
      expect(adminWs.sent).toHaveLength(0);
    });
  });

  describe('downstream forwarding (admin → player)', () => {
    it('forwards targeted event to the correct player', () => {
      registerAdmin();
      const connId = connectPlayer();
      playerWs.clearSent();

      const event = JSON.stringify({ type: 'joined', playerId: 'p1', screenName: 'Alice', gameStatus: 'no_game', round: 0 });
      adminWs.receive({ envelope: 'downstream', target: connId, event });
      expect(playerWs.lastMessage()?.type).toBe('joined');
      expect(playerWs.lastMessage()?.screenName).toBe('Alice');
    });

    it('broadcasts event to all connected players', () => {
      registerAdmin();
      const player1 = new MockWs();
      const player2 = new MockWs();
      handler.handlePlayerConnection(player1 as any);
      handler.handlePlayerConnection(player2 as any);
      player1.clearSent();
      player2.clearSent();

      const event = JSON.stringify({ type: 'game_status', status: 'active', round: 1 });
      adminWs.receive({ envelope: 'broadcast', event });

      expect(player1.lastMessage()?.type).toBe('game_status');
      expect(player2.lastMessage()?.type).toBe('game_status');
    });

    it('does not send targeted event to wrong player', () => {
      registerAdmin();
      const player1 = new MockWs();
      const player2 = new MockWs();
      handler.handlePlayerConnection(player1 as any);
      handler.handlePlayerConnection(player2 as any);
      const conn1 = adminWs.messagesOfEnvelope('player_connected')[0]?.connectionId as string;
      player1.clearSent();
      player2.clearSent();

      const event = JSON.stringify({ type: 'card_dealt', roundNumber: 1, grid: [], marked: [] });
      adminWs.receive({ envelope: 'downstream', target: conn1, event });

      expect(player1.lastMessage()?.type).toBe('card_dealt');
      expect(player2.sent).toHaveLength(0);
    });

    it('silently ignores downstream for unknown connectionId', () => {
      registerAdmin();
      adminWs.clearSent();

      const event = JSON.stringify({ type: 'joined' });
      adminWs.receive({ envelope: 'downstream', target: 'nonexistent', event });
      // Should not throw, no error sent back
      expect(adminWs.sent).toHaveLength(0);
    });
  });

  describe('admin reconnection', () => {
    it('sends player_roster on reconnect', () => {
      registerAdmin();
      const player1 = new MockWs();
      const player2 = new MockWs();
      handler.handlePlayerConnection(player1 as any);
      handler.handlePlayerConnection(player2 as any);

      // Admin disconnects
      adminWs.simulateClose();

      // New admin connects
      const newAdminWs = new MockWs();
      handler.handleAdminConnection(newAdminWs as any);
      newAdminWs.receive({ envelope: 'admin_register', sessionId: 'sess-1', secret: SECRET });

      const registered = newAdminWs.allMessages().find((m) => m.envelope === 'admin_registered');
      expect(registered).toBeDefined();

      const roster = newAdminWs.allMessages().find((m) => m.envelope === 'player_roster');
      expect(roster).toBeDefined();
      expect((roster?.connections as string[]).length).toBe(2);
    });

    it('preserves player connections across admin reconnect', () => {
      registerAdmin();
      handler.handlePlayerConnection(playerWs as any);
      const connId = adminWs.messagesOfEnvelope('player_connected')[0]?.connectionId as string;

      adminWs.simulateClose();

      // New admin
      const newAdminWs = new MockWs();
      handler.handleAdminConnection(newAdminWs as any);
      newAdminWs.receive({ envelope: 'admin_register', sessionId: 'sess-1', secret: SECRET });
      newAdminWs.clearSent();

      // Player sends command — should go to new admin
      playerWs.receive({ type: 'join', screenName: 'Alice' });
      const msg = newAdminWs.lastMessage();
      expect(msg?.envelope).toBe('upstream');
      expect(msg?.connectionId).toBe(connId);
    });
  });

  describe('admin disconnect notification', () => {
    it('notifies connected players when admin disconnects', () => {
      registerAdmin();
      handler.handlePlayerConnection(playerWs as any);
      playerWs.clearSent();

      adminWs.simulateClose();
      const msg = playerWs.lastMessage();
      expect(msg?.type).toBe('error');
      expect((msg?.message as string).toLowerCase()).toContain('disconnect');
    });
  });

  describe('multiple admins', () => {
    it('rejects a second admin while one is connected', () => {
      registerAdmin();
      const secondAdmin = new MockWs();
      handler.handleAdminConnection(secondAdmin as any);
      secondAdmin.receive({ envelope: 'admin_register', sessionId: 'sess-2', secret: SECRET });
      const msg = secondAdmin.lastMessage();
      expect(msg?.envelope).toBe('admin_error');
      expect((msg?.message as string).toLowerCase()).toContain('already');
    });
  });
});
