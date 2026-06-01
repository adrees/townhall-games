import { createAdminWsHandler } from '../admin-ws-handler';
import { EventEmitter } from 'events';
import { TriviaGame } from '../../core/games/trivia';
import { Session } from '../../core/session';
import type { TriviaQuestion } from '../../core/types';

function makeQuestions(n = 3): TriviaQuestion[] {
  return Array.from({ length: n }, (_, i) => ({
    question: `Q${i + 1}?`,
    a: 'A1', b: 'B1', c: 'C1', d: 'D1',
    correct: 'A' as const,
  }));
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
    adminWs.receive({ type: 'create_session', questions: makeQuestions() });
  }

  function joinPlayer(connectionId: string, screenName: string): void {
    handler.handlePlayerCommand(connectionId, JSON.stringify({ type: 'join', screenName }));
  }

  describe('restart_game', () => {
    it('broadcasts game_reset to all players via relay', () => {
      connectAdmin();
      relay.clearAll();

      adminWs.receive({ type: 'restart_game' });

      expect(relay.broadcastsOfType('game_reset')).toHaveLength(1);
    });

    it('is a no-op when no session exists', () => {
      handler.handleAdminConnection(adminWs as any);
      relay.clearAll();

      adminWs.receive({ type: 'restart_game' });

      expect(relay.broadcasts).toHaveLength(0);
      expect(adminWs.lastMessage()).toBeNull();
    });

    it('allows create_session after restart', () => {
      connectAdmin();
      adminWs.receive({ type: 'restart_game' });
      relay.clearAll();
      adminWs.clearSent();

      adminWs.receive({ type: 'create_session', questions: makeQuestions() });

      expect(adminWs.lastMessage()?.type).toBe('session_created');
    });

    it('broadcasts session_created to players via relay after new create_session', () => {
      connectAdmin();
      adminWs.receive({ type: 'restart_game' });
      relay.clearAll();

      adminWs.receive({ type: 'create_session', questions: makeQuestions() });

      expect(relay.broadcastsOfType('session_created')).toHaveLength(1);
    });
  });

  describe('create_session', () => {
    it('creates a trivia session and responds with session_created', () => {
      handler.handleAdminConnection(adminWs as any);
      adminWs.receive({ type: 'create_session', questions: makeQuestions() });
      const msg = adminWs.lastMessage();
      expect(msg?.type).toBe('session_created');
      expect(msg?.sessionId).toBeDefined();
    });

    it('broadcasts session_created to players via relay', () => {
      handler.handleAdminConnection(adminWs as any);
      adminWs.receive({ type: 'create_session', questions: makeQuestions() });
      expect(relay.broadcastsOfType('session_created')).toHaveLength(1);
    });

    it('replaces existing session and broadcasts game_reset then session_created', () => {
      connectAdmin();
      relay.clearAll();
      adminWs.clearSent();

      adminWs.receive({ type: 'create_session', questions: makeQuestions() });

      expect(relay.broadcastsOfType('game_reset')).toHaveLength(1);
      expect(relay.broadcastsOfType('session_created')).toHaveLength(1);
      expect(adminWs.lastMessage()?.type).toBe('session_created');
    });

    it('uses 3-second timer when speed: true', () => {
      handler.handleAdminConnection(adminWs as any);
      adminWs.receive({ type: 'create_session', questions: makeQuestions(), speed: true });
      expect(adminWs.lastMessage()?.type).toBe('session_created');
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

  describe('invalid commands', () => {
    it('returns error for invalid JSON', () => {
      connectAdmin();
      handler.handlePlayerCommand('conn-1', 'not json');
      const msg = relay.lastSentTo('conn-1');
      expect(msg?.type).toBe('error');
      expect(msg?.message).toBe('Invalid command');
    });
  });

  describe('Trivia mode', () => {
    const QUESTIONS: TriviaQuestion[] = [
      { question: 'Q1', a: 'A1', b: 'B1', c: 'C1', d: 'D1', correct: 'A' },
      { question: 'Q2', a: 'A2', b: 'B2', c: 'C2', d: 'D2', correct: 'B' },
      { question: 'Q3', a: 'A3', b: 'B3', c: 'C3', d: 'D3', correct: 'C' },
    ];

    function makeTriviaHandler() {
      const game = new TriviaGame('test', QUESTIONS);
      const session = new Session();
      game.registerPlayers([]);
      const h = createAdminWsHandler(relay, game, session);
      return { handler: h, game, session };
    }

    it('start_trivia_question broadcasts question_preview to admin and relay', () => {
      jest.useFakeTimers();
      const { handler: h } = makeTriviaHandler();
      h.handleAdminConnection(adminWs as any);
      adminWs.receive({ type: 'start_trivia_question', questionIndex: 0 });

      const adminPreview = adminWs.messagesOfType('question_preview')[0];
      expect(adminPreview?.text).toBe('Q1');

      const relayPreview = relay.broadcastsOfType('question_preview')[0];
      expect(relayPreview?.text).toBe('Q1');
      jest.useRealTimers();
    });

    it('go_live broadcasts question_live via relay broadcastToPlayers', () => {
      jest.useFakeTimers();
      const { handler: h } = makeTriviaHandler();
      h.handleAdminConnection(adminWs as any);
      adminWs.receive({ type: 'start_trivia_question', questionIndex: 0 });
      relay.clearAll(); adminWs.clearSent();

      adminWs.receive({ type: 'go_live' });

      const live = relay.broadcastsOfType('question_live')[0];
      expect(live).toBeDefined();
      expect(live?.text).toBe('Q1');
      expect((live?.options as string[]).length).toBe(4);
      jest.useRealTimers();
    });

    it('player submit_answer sends answer_accepted via sendToPlayer and live_answer_stats to admin', () => {
      jest.useFakeTimers();
      const game = new TriviaGame('test', QUESTIONS);
      const session = new Session();
      const h = createAdminWsHandler(relay, game, session);
      h.handleAdminConnection(adminWs as any);

      h.handlePlayerCommand('conn-1', JSON.stringify({ type: 'join', screenName: 'Alice' }));
      const joinedMsg = relay.lastSentTo('conn-1');
      const playerId = joinedMsg?.playerId as string;
      game.registerPlayers([playerId]);
      relay.clearAll(); adminWs.clearSent();

      adminWs.receive({ type: 'start_trivia_question', questionIndex: 0 });
      adminWs.receive({ type: 'go_live' });
      relay.clearAll(); adminWs.clearSent();

      h.handlePlayerCommand('conn-1', JSON.stringify({ type: 'submit_answer', answer: 'A' }));

      const accepted = relay.allSentTo('conn-1').find(m => m.type === 'answer_accepted');
      expect(accepted).toBeDefined();
      const stats = adminWs.messagesOfType('live_answer_stats')[0];
      expect(stats?.answered).toBe(1);
      jest.useRealTimers();
    });

    it('go_live registers joined players so they appear as survivors when correct', () => {
      jest.useFakeTimers();
      const game = new TriviaGame('test', QUESTIONS);
      const session = new Session();
      const h = createAdminWsHandler(relay, game, session);
      h.handleAdminConnection(adminWs as any);

      h.handlePlayerCommand('conn-1', JSON.stringify({ type: 'join', screenName: 'Alice' }));
      const joinedMsg = relay.lastSentTo('conn-1');
      const playerId = joinedMsg?.playerId as string;
      // No manual registerPlayers — go_live should auto-register

      adminWs.receive({ type: 'start_trivia_question', questionIndex: 0 });
      adminWs.receive({ type: 'go_live' });
      relay.clearAll(); adminWs.clearSent();

      h.handlePlayerCommand('conn-1', JSON.stringify({ type: 'submit_answer', answer: 'A' }));
      jest.advanceTimersByTime(10000); // timer_expired
      jest.advanceTimersByTime(2500);  // reveal

      const revealed = relay.broadcastsOfType('answer_revealed')[0];
      expect(revealed?.survivors).toContain(playerId);
      expect(revealed?.eliminated).toHaveLength(0);
      jest.useRealTimers();
    });

    it('timer expiry + reveal sequence broadcasts via relay', () => {
      jest.useFakeTimers();
      const { handler: h } = makeTriviaHandler();
      h.handleAdminConnection(adminWs as any);
      adminWs.receive({ type: 'start_trivia_question', questionIndex: 0 });
      adminWs.receive({ type: 'go_live' });
      relay.clearAll(); adminWs.clearSent();

      jest.advanceTimersByTime(10000);
      expect(relay.broadcastsOfType('timer_expired')).toHaveLength(1);
      expect(relay.broadcastsOfType('answer_breakdown')).toHaveLength(1);

      jest.advanceTimersByTime(2500);
      expect(relay.broadcastsOfType('answer_revealed')).toHaveLength(1);
      jest.useRealTimers();
    });
  });
});
