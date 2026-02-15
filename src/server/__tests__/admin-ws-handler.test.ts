import { createAdminWsHandler } from '../admin-ws-handler';
import { EventEmitter } from 'events';

function makeWords(count = 30): string[] {
  return Array.from({ length: count }, (_, i) => `word${i + 1}`);
}

// Mock WebSocket for the local admin connection
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

  messagesOfType(type: string): Record<string, unknown>[] {
    return this.allMessages().filter((m) => m.type === type);
  }

  clearSent(): void {
    this.sent = [];
  }
}

// Mock relay client that records calls
function createMockRelayClient() {
  const sent: { type: string; connectionId?: string; event: string }[] = [];
  const broadcasts: string[] = [];

  return {
    sent,
    broadcasts,
    sendToPlayer(connectionId: string, event: string): void {
      sent.push({ type: 'targeted', connectionId, event });
    },
    broadcastToPlayers(event: string): void {
      broadcasts.push(event);
    },
    lastSentTo(connectionId: string): Record<string, unknown> | null {
      const msgs = sent.filter((s) => s.connectionId === connectionId);
      if (msgs.length === 0) return null;
      return JSON.parse(msgs[msgs.length - 1].event);
    },
    allSentTo(connectionId: string): Record<string, unknown>[] {
      return sent.filter((s) => s.connectionId === connectionId).map((s) => JSON.parse(s.event));
    },
    lastBroadcast(): Record<string, unknown> | null {
      if (broadcasts.length === 0) return null;
      return JSON.parse(broadcasts[broadcasts.length - 1]);
    },
    allBroadcasts(): Record<string, unknown>[] {
      return broadcasts.map((s) => JSON.parse(s));
    },
    broadcastsOfType(type: string): Record<string, unknown>[] {
      return this.allBroadcasts().filter((m) => m.type === type);
    },
    clearAll(): void {
      sent.length = 0;
      broadcasts.length = 0;
    },
  };
}

describe('AdminWsHandler', () => {
  let handler: ReturnType<typeof createAdminWsHandler>;
  let adminWs: MockWs;
  let relay: ReturnType<typeof createMockRelayClient>;

  beforeEach(() => {
    relay = createMockRelayClient();
    handler = createAdminWsHandler(relay);
    adminWs = new MockWs();
  });

  function connectAdmin(): void {
    handler.handleAdminConnection(adminWs as any);
    adminWs.receive({ type: 'create_session', words: makeWords() });
  }

  function joinPlayer(connectionId: string, screenName: string): void {
    handler.handlePlayerCommand(connectionId, JSON.stringify({ type: 'join', screenName }));
  }

  describe('create_session', () => {
    it('creates a session and responds with session_created', () => {
      handler.handleAdminConnection(adminWs as any);
      adminWs.receive({ type: 'create_session', words: makeWords() });
      const msg = adminWs.lastMessage();
      expect(msg?.type).toBe('session_created');
      expect(msg?.sessionId).toBeDefined();
    });

    it('returns error if session already exists', () => {
      connectAdmin();
      adminWs.receive({ type: 'create_session', words: makeWords() });
      expect(adminWs.lastMessage()?.type).toBe('error');
    });
  });

  describe('player join via relay', () => {
    it('sends joined response to the correct connectionId', () => {
      connectAdmin();

      joinPlayer('conn-1', 'Alice');
      const msg = relay.lastSentTo('conn-1');
      expect(msg?.type).toBe('joined');
      expect(msg?.screenName).toBe('Alice');
      expect(msg?.playerId).toBeDefined();
      expect(msg?.gameStatus).toBe('no_game');
    });

    it('broadcasts player_joined to all players and admin', () => {
      connectAdmin();
      adminWs.clearSent();
      relay.clearAll();

      joinPlayer('conn-1', 'Alice');

      const adminMsg = adminWs.messagesOfType('player_joined')[0];
      expect(adminMsg?.screenName).toBe('Alice');
      expect(adminMsg?.playerCount).toBe(1);

      expect(relay.broadcastsOfType('player_joined').length).toBeGreaterThanOrEqual(1);
    });

    it('returns error if no session', () => {
      handler.handleAdminConnection(adminWs as any);
      // No create_session
      handler.handlePlayerCommand('conn-1', JSON.stringify({ type: 'join', screenName: 'Alice' }));
      const msg = relay.lastSentTo('conn-1');
      expect(msg?.type).toBe('error');
    });
  });

  describe('start_game', () => {
    it('starts the game and deals cards to players via relay', () => {
      connectAdmin();
      joinPlayer('conn-1', 'Alice');
      relay.clearAll();
      adminWs.clearSent();

      adminWs.receive({ type: 'start_game' });

      // Player should receive card_dealt via relay
      const card = relay.allSentTo('conn-1').find((m) => m.type === 'card_dealt');
      expect(card).toBeDefined();
      expect(card?.roundNumber).toBe(1);
      expect(card?.grid).toBeDefined();

      // game_status broadcast
      expect(relay.broadcastsOfType('game_status').length).toBeGreaterThanOrEqual(1);
      const status = relay.broadcastsOfType('game_status')[0];
      expect(status?.status).toBe('active');

      // Admin also gets game_status
      expect(adminWs.messagesOfType('game_status').length).toBeGreaterThanOrEqual(1);
    });

    it('returns error if not admin', () => {
      connectAdmin();
      // Player tries to start game
      handler.handlePlayerCommand('conn-1', JSON.stringify({ type: 'start_game' }));
      const msg = relay.lastSentTo('conn-1');
      expect(msg?.type).toBe('error');
    });
  });

  describe('mark_word via relay', () => {
    it('returns mark_result to the player', () => {
      connectAdmin();
      joinPlayer('conn-1', 'Alice');
      adminWs.receive({ type: 'start_game' });

      // Get a word from the dealt card
      const card = relay.allSentTo('conn-1').find((m) => m.type === 'card_dealt');
      const grid = card?.grid as string[][];
      const word = grid[0][0];
      relay.clearAll();

      handler.handlePlayerCommand('conn-1', JSON.stringify({ type: 'mark_word', word }));
      const result = relay.lastSentTo('conn-1');
      expect(result?.type).toBe('mark_result');
      expect(result?.success).toBe(true);
      expect(result?.word).toBe(word);
    });

    it('returns error if player not joined', () => {
      connectAdmin();
      handler.handlePlayerCommand('conn-unknown', JSON.stringify({ type: 'mark_word', word: 'test' }));
      const msg = relay.lastSentTo('conn-unknown');
      expect(msg?.type).toBe('error');
      expect(msg?.message).toBe('Not joined as a player');
    });
  });

  describe('start_new_round', () => {
    it('starts a new round after a win', () => {
      connectAdmin();
      joinPlayer('conn-1', 'Alice');
      adminWs.receive({ type: 'start_game' });

      // Win by marking first row
      const card = relay.allSentTo('conn-1').find((m) => m.type === 'card_dealt');
      const grid = card?.grid as string[][];
      for (let c = 0; c < 5; c++) {
        handler.handlePlayerCommand('conn-1', JSON.stringify({ type: 'mark_word', word: grid[0][c] }));
      }
      relay.clearAll();
      adminWs.clearSent();

      adminWs.receive({ type: 'start_new_round' });

      const newCard = relay.allSentTo('conn-1').find((m) => m.type === 'card_dealt');
      expect(newCard).toBeDefined();
      expect(newCard?.roundNumber).toBe(2);
    });
  });

  describe('player disconnect', () => {
    it('removes player and broadcasts player_left', () => {
      connectAdmin();
      joinPlayer('conn-1', 'Alice');
      adminWs.clearSent();
      relay.clearAll();

      handler.handlePlayerDisconnected('conn-1');

      const leftMsg = adminWs.messagesOfType('player_left')[0];
      expect(leftMsg).toBeDefined();
      expect(leftMsg?.screenName).toBe('Alice');
      expect(leftMsg?.playerCount).toBe(0);

      expect(relay.broadcastsOfType('player_left').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('late joiner', () => {
    it('gets a card dealt when joining an active game', () => {
      connectAdmin();
      joinPlayer('conn-1', 'Bob');
      adminWs.receive({ type: 'start_game' });
      relay.clearAll();

      // Late join
      joinPlayer('conn-2', 'Alice');

      const card = relay.allSentTo('conn-2').find((m) => m.type === 'card_dealt');
      expect(card).toBeDefined();
      expect(card?.roundNumber).toBe(1);
    });
  });

  describe('invalid commands', () => {
    it('returns error for invalid JSON', () => {
      connectAdmin();
      handler.handlePlayerCommand('conn-1', 'not json');
      const msg = relay.lastSentTo('conn-1');
      expect(msg?.type).toBe('error');
      expect(msg?.message).toBe('Invalid command');
    });
  });
});
