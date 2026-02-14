import { createWsHandler } from '../ws-handler';
import { EventEmitter } from 'events';

// Generate 24+ unique words for testing
function makeWords(count = 30): string[] {
  return Array.from({ length: count }, (_, i) => `word${i + 1}`);
}

// Mock WebSocket
class MockWs extends EventEmitter {
  sent: string[] = [];
  readyState = 1; // OPEN
  OPEN = 1;

  send(data: string): void {
    this.sent.push(data);
  }

  // Simulate receiving a message
  receive(data: object): void {
    this.emit('message', Buffer.from(JSON.stringify(data)));
  }

  // Simulate close
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

describe('WsHandler', () => {
  let handler: ReturnType<typeof createWsHandler>;
  let adminWs: MockWs;
  let playerWs: MockWs;

  beforeEach(() => {
    handler = createWsHandler();
    adminWs = new MockWs();
    playerWs = new MockWs();
  });

  function connectAdmin(): void {
    handler.handleConnection(adminWs as any);
    adminWs.receive({ type: 'create_session', words: makeWords() });
  }

  function connectAndJoinPlayer(name = 'Alice'): string {
    handler.handleConnection(playerWs as any);
    playerWs.receive({ type: 'join', screenName: name });
    const joined = playerWs.messagesOfType('joined')[0];
    return joined?.playerId as string;
  }

  describe('create_session', () => {
    it('creates a session and responds with session_created', () => {
      handler.handleConnection(adminWs as any);
      adminWs.receive({ type: 'create_session', words: makeWords() });
      const msg = adminWs.lastMessage();
      expect(msg?.type).toBe('session_created');
      expect(msg?.sessionId).toBeDefined();
    });

    it('returns error if session already exists', () => {
      connectAdmin();
      adminWs.receive({ type: 'create_session', words: makeWords() });
      const msg = adminWs.lastMessage();
      expect(msg?.type).toBe('error');
      expect(msg?.message).toBe('Session already exists');
    });

    it('returns error if word list is too short', () => {
      handler.handleConnection(adminWs as any);
      adminWs.receive({ type: 'create_session', words: ['a', 'b', 'c'] });
      const msg = adminWs.lastMessage();
      expect(msg?.type).toBe('error');
    });
  });

  describe('join', () => {
    it('lets a player join and responds with joined', () => {
      connectAdmin();
      handler.handleConnection(playerWs as any);
      playerWs.receive({ type: 'join', screenName: 'Alice' });
      const msg = playerWs.messagesOfType('joined')[0];
      expect(msg?.type).toBe('joined');
      expect(msg?.screenName).toBe('Alice');
      expect(msg?.playerId).toBeDefined();
      expect(msg?.gameStatus).toBe('no_game');
    });

    it('returns error if no session exists', () => {
      handler.handleConnection(playerWs as any);
      playerWs.receive({ type: 'join', screenName: 'Alice' });
      expect(playerWs.lastMessage()?.type).toBe('error');
    });

    it('broadcasts player_joined to admin and other players', () => {
      connectAdmin();
      const otherPlayer = new MockWs();
      handler.handleConnection(otherPlayer as any);
      otherPlayer.receive({ type: 'join', screenName: 'Bob' });
      otherPlayer.clearSent();
      adminWs.clearSent();

      handler.handleConnection(playerWs as any);
      playerWs.receive({ type: 'join', screenName: 'Alice' });

      // Admin should receive player_joined broadcast
      const adminMsg = adminWs.messagesOfType('player_joined')[0];
      expect(adminMsg).toBeDefined();
      expect(adminMsg?.screenName).toBe('Alice');
      expect(adminMsg?.playerCount).toBe(2);
    });
  });

  describe('start_game', () => {
    it('starts the game and deals cards to players', () => {
      connectAdmin();
      connectAndJoinPlayer('Alice');
      playerWs.clearSent();
      adminWs.clearSent();

      adminWs.receive({ type: 'start_game' });

      // Player should receive card_dealt
      const card = playerWs.messagesOfType('card_dealt')[0];
      expect(card).toBeDefined();
      expect(card?.roundNumber).toBe(1);
      expect(card?.grid).toBeDefined();
      expect(card?.marked).toBeDefined();

      // Both should receive game_status
      const adminStatus = adminWs.messagesOfType('game_status')[0];
      expect(adminStatus?.status).toBe('active');
      expect(adminStatus?.round).toBe(1);
    });

    it('returns error if not admin', () => {
      connectAdmin();
      connectAndJoinPlayer();
      playerWs.clearSent();
      playerWs.receive({ type: 'start_game' });
      expect(playerWs.lastMessage()?.type).toBe('error');
      expect(playerWs.lastMessage()?.message).toContain('Only admin');
    });

    it('returns error if no session', () => {
      handler.handleConnection(adminWs as any);
      adminWs.receive({ type: 'start_game' });
      expect(adminWs.lastMessage()?.type).toBe('error');
    });
  });

  describe('mark_word', () => {
    it('returns mark_result to the player', () => {
      connectAdmin();
      connectAndJoinPlayer('Alice');
      adminWs.receive({ type: 'start_game' });

      // Get a word from the dealt card
      const card = playerWs.messagesOfType('card_dealt')[0];
      const grid = card?.grid as string[][];
      const word = grid[0][0]; // First word on card
      playerWs.clearSent();

      playerWs.receive({ type: 'mark_word', word });
      const result = playerWs.messagesOfType('mark_result')[0];
      expect(result?.type).toBe('mark_result');
      expect(result?.success).toBe(true);
      expect(result?.word).toBe(word);
    });

    it('returns error if not a player', () => {
      connectAdmin();
      adminWs.receive({ type: 'mark_word', word: 'test' });
      const msg = adminWs.lastMessage();
      expect(msg?.type).toBe('error');
      expect(msg?.message).toBe('Not joined as a player');
    });
  });

  describe('start_new_round', () => {
    it('starts a new round after a win', () => {
      connectAdmin();
      connectAndJoinPlayer('Alice');
      adminWs.receive({ type: 'start_game' });

      // Mark all words in row 0 to win
      const card = playerWs.messagesOfType('card_dealt')[0];
      const grid = card?.grid as string[][];
      for (let c = 0; c < 5; c++) {
        playerWs.receive({ type: 'mark_word', word: grid[0][c] });
      }

      adminWs.clearSent();
      playerWs.clearSent();

      adminWs.receive({ type: 'start_new_round' });

      // Player should get a new card
      const newCard = playerWs.messagesOfType('card_dealt')[0];
      expect(newCard).toBeDefined();
      expect(newCard?.roundNumber).toBe(2);
    });
  });

  describe('disconnect', () => {
    it('removes player on close and broadcasts player_left', () => {
      connectAdmin();
      connectAndJoinPlayer('Alice');
      adminWs.clearSent();

      playerWs.simulateClose();

      const leftMsg = adminWs.messagesOfType('player_left')[0];
      expect(leftMsg).toBeDefined();
      expect(leftMsg?.screenName).toBe('Alice');
      expect(leftMsg?.playerCount).toBe(0);
    });
  });

  describe('invalid commands', () => {
    it('returns error for invalid JSON', () => {
      handler.handleConnection(adminWs as any);
      adminWs.emit('message', Buffer.from('not json'));
      expect(adminWs.lastMessage()?.type).toBe('error');
      expect(adminWs.lastMessage()?.message).toBe('Invalid command');
    });

    it('returns error for unknown command type', () => {
      handler.handleConnection(adminWs as any);
      adminWs.receive({ type: 'unknown_thing' });
      expect(adminWs.lastMessage()?.type).toBe('error');
    });
  });

  describe('late joiner', () => {
    it('gets a card dealt when joining an active game', () => {
      connectAdmin();
      const earlyPlayer = new MockWs();
      handler.handleConnection(earlyPlayer as any);
      earlyPlayer.receive({ type: 'join', screenName: 'Bob' });

      adminWs.receive({ type: 'start_game' });

      // Now Alice joins late
      handler.handleConnection(playerWs as any);
      playerWs.receive({ type: 'join', screenName: 'Alice' });

      const card = playerWs.messagesOfType('card_dealt')[0];
      expect(card).toBeDefined();
      expect(card?.roundNumber).toBe(1);
    });
  });
});
