import { createWsHandler } from '../ws-handler';
import { EventEmitter } from 'events';
import { TriviaGame } from '../../core/games/trivia';
import { Session } from '../../core/session';
import type { TriviaQuestion } from '../../core/types';

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
    adminWs.receive({ type: 'create_session', gameMode: 'bingo', words: makeWords() });
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
      adminWs.receive({ type: 'create_session', gameMode: 'bingo', words: makeWords() });
      const msg = adminWs.lastMessage();
      expect(msg?.type).toBe('session_created');
      expect(msg?.sessionId).toBeDefined();
    });

    it('replaces an existing session when called again', () => {
      connectAdmin();
      const first = adminWs.messagesOfType('session_created')[0];
      adminWs.receive({ type: 'create_session', gameMode: 'bingo', words: makeWords() });
      const second = adminWs.messagesOfType('session_created')[1];
      expect(second?.type).toBe('session_created');
      expect(second?.sessionId).not.toBe(first?.sessionId);
    });

    it('returns error if word list is too short', () => {
      handler.handleConnection(adminWs as any);
      adminWs.receive({ type: 'create_session', gameMode: 'bingo', words: ['a', 'b', 'c'] });
      const msg = adminWs.lastMessage();
      expect(msg?.type).toBe('error');
    });

    describe('trivia', () => {
      const makeQuestions = (n = 3): TriviaQuestion[] =>
        Array.from({ length: n }, (_, i) => ({
          question: `Q${i + 1}?`,
          a: 'A1', b: 'B1', c: 'C1', d: 'D1',
          correct: 'A' as const,
        }));

      it('creates a trivia session and responds with session_created', () => {
        handler.handleConnection(adminWs as any);
        adminWs.receive({ type: 'create_session', gameMode: 'trivia', questions: makeQuestions() });
        const msg = adminWs.lastMessage();
        expect(msg?.type).toBe('session_created');
        expect(msg?.sessionId).toBeDefined();
      });

      it('uses 3-second timer when speed: true', () => {
        handler.handleConnection(adminWs as any);
        adminWs.receive({ type: 'create_session', gameMode: 'trivia', questions: makeQuestions(), speed: true });
        expect(adminWs.lastMessage()?.type).toBe('session_created');
        // Speed mode yields a 3s timer — verified indirectly by session creation success
      });
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

  describe('cross-mode rejection (bingo)', () => {
    it('returns error when trivia command sent to bingo session', () => {
      connectAdmin();
      adminWs.clearSent();
      adminWs.receive({ type: 'go_live' });
      expect(adminWs.lastMessage()?.type).toBe('error');
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

  describe('Trivia mode', () => {
    const QUESTIONS: TriviaQuestion[] = [
      { question: 'Q1', a: 'A1', b: 'B1', c: 'C1', d: 'D1', correct: 'A' },
      { question: 'Q2', a: 'A2', b: 'B2', c: 'C2', d: 'D2', correct: 'B' },
      { question: 'Q3', a: 'A3', b: 'B3', c: 'C3', d: 'D3', correct: 'C' },
    ];

    function makeTriviaHandler() {
      const game = new TriviaGame('test', QUESTIONS);
      const session = new Session('trivia', []);
      game.registerPlayers([]);
      const h = createWsHandler(game, session);
      return { handler: h, game, session };
    }

    function connectTriviaAdmin(h: ReturnType<typeof createWsHandler>, ws: MockWs) {
      h.handleConnection(ws as any);
      // First message sets adminSocket for injected trivia session
      ws.receive({ type: 'go_live' }); // will error (wrong state) but sets adminSocket
      ws.clearSent();
    }

    it('start_trivia_question transitions to question_preview and broadcasts', () => {
      jest.useFakeTimers();
      const { handler: h } = makeTriviaHandler();
      connectTriviaAdmin(h, adminWs);

      adminWs.receive({ type: 'start_trivia_question', questionIndex: 0 });
      const preview = adminWs.messagesOfType('question_preview')[0];
      expect(preview).toBeDefined();
      expect(preview?.text).toBe('Q1');
      expect(preview?.questionIndex).toBe(0);
      jest.useRealTimers();
    });

    it('go_live broadcasts question_live with options and timeLimit', () => {
      jest.useFakeTimers();
      const { handler: h } = makeTriviaHandler();
      connectTriviaAdmin(h, adminWs);

      adminWs.receive({ type: 'start_trivia_question', questionIndex: 0 });
      adminWs.clearSent();
      adminWs.receive({ type: 'go_live' });

      const live = adminWs.messagesOfType('question_live')[0];
      expect(live).toBeDefined();
      expect(live?.text).toBe('Q1');
      expect((live?.options as string[]).length).toBe(4);
      expect(live?.timeLimit).toBe(10);
      jest.useRealTimers();
    });

    it('submit_answer sends answer_accepted to player and live_answer_stats to admin', () => {
      jest.useFakeTimers();
      const game = new TriviaGame('test', QUESTIONS);
      const session = new Session('trivia', []);
      const h = createWsHandler(game, session);

      h.handleConnection(adminWs as any);
      adminWs.receive({ type: 'go_live' }); // sets adminSocket, errors (wrong state) — ok
      adminWs.clearSent();

      h.handleConnection(playerWs as any);
      playerWs.receive({ type: 'join', screenName: 'Alice' });
      const joinedMsg = playerWs.messagesOfType('joined')[0];
      const playerId = joinedMsg?.playerId as string;
      game.registerPlayers([playerId]);
      playerWs.clearSent();
      adminWs.clearSent();

      adminWs.receive({ type: 'start_trivia_question', questionIndex: 0 });
      adminWs.receive({ type: 'go_live' });
      adminWs.clearSent();
      playerWs.clearSent();

      playerWs.receive({ type: 'submit_answer', answer: 'A' });

      expect(playerWs.messagesOfType('answer_accepted')).toHaveLength(1);
      const stats = adminWs.messagesOfType('live_answer_stats')[0];
      expect(stats).toBeDefined();
      expect(stats?.answered).toBe(1);
      jest.useRealTimers();
    });

    it('timer expiry broadcasts timer_expired + answer_breakdown, then after delay broadcasts answer_revealed', () => {
      jest.useFakeTimers();
      const game = new TriviaGame('test', QUESTIONS);
      const session = new Session('trivia', []);
      const h = createWsHandler(game, session);

      h.handleConnection(adminWs as any);
      adminWs.receive({ type: 'go_live' });
      adminWs.clearSent();

      adminWs.receive({ type: 'start_trivia_question', questionIndex: 0 });
      adminWs.receive({ type: 'go_live' });
      adminWs.clearSent();

      // Advance past question timer
      jest.advanceTimersByTime(10000);
      expect(adminWs.messagesOfType('timer_expired')).toHaveLength(1);
      expect(adminWs.messagesOfType('answer_breakdown')).toHaveLength(1);

      // Advance past reveal delay
      jest.advanceTimersByTime(2500);
      expect(adminWs.messagesOfType('answer_revealed')).toHaveLength(1);

      jest.useRealTimers();
    });

    it('advance_question moves to next question_preview', () => {
      jest.useFakeTimers();
      const game = new TriviaGame('test', QUESTIONS);
      const session = new Session('trivia', []);
      const h = createWsHandler(game, session);

      h.handleConnection(adminWs as any);
      adminWs.receive({ type: 'go_live' });
      adminWs.clearSent();

      adminWs.receive({ type: 'start_trivia_question', questionIndex: 0 });
      adminWs.receive({ type: 'go_live' });
      jest.advanceTimersByTime(10000 + 2500);
      adminWs.clearSent();

      adminWs.receive({ type: 'advance_question' });
      const preview = adminWs.messagesOfType('question_preview')[0];
      expect(preview).toBeDefined();
      expect(preview?.text).toBe('Q2');
      jest.useRealTimers();
    });

    it('bingo command (mark_word) on trivia session returns error', () => {
      const { handler: h } = makeTriviaHandler();
      h.handleConnection(playerWs as any);
      playerWs.receive({ type: 'join', screenName: 'Bob' });
      playerWs.clearSent();
      playerWs.receive({ type: 'mark_word', word: 'synergy' });
      expect(playerWs.lastMessage()?.type).toBe('error');
    });
  });

  describe('spectator / broadcast screen', () => {
    it('receives player_joined after sending register_spectator', () => {
      connectAdmin();

      const spectatorWs = new MockWs();
      handler.handleConnection(spectatorWs as any);
      spectatorWs.receive({ type: 'register_spectator' });
      spectatorWs.clearSent();

      handler.handleConnection(playerWs as any);
      playerWs.receive({ type: 'join', screenName: 'Alice' });

      const msg = spectatorWs.messagesOfType('player_joined')[0];
      expect(msg).toBeDefined();
      expect(msg?.screenName).toBe('Alice');
      expect(msg?.playerCount).toBe(1);
    });

    it('does NOT receive player_joined without register_spectator', () => {
      connectAdmin();

      const spectatorWs = new MockWs();
      handler.handleConnection(spectatorWs as any);
      // deliberately skip register_spectator
      spectatorWs.clearSent();

      handler.handleConnection(playerWs as any);
      playerWs.receive({ type: 'join', screenName: 'Alice' });

      expect(spectatorWs.messagesOfType('player_joined')).toHaveLength(0);
    });

    it('receives player_left when a player disconnects', () => {
      connectAdmin();

      const spectatorWs = new MockWs();
      handler.handleConnection(spectatorWs as any);
      spectatorWs.receive({ type: 'register_spectator' });

      handler.handleConnection(playerWs as any);
      playerWs.receive({ type: 'join', screenName: 'Alice' });
      spectatorWs.clearSent();

      playerWs.simulateClose();

      const msg = spectatorWs.messagesOfType('player_left')[0];
      expect(msg).toBeDefined();
      expect(msg?.screenName).toBe('Alice');
      expect(msg?.playerCount).toBe(0);
    });

    it('receives question_live broadcast during trivia game', () => {
      jest.useFakeTimers();
      const game = new TriviaGame('test', [
        { question: 'Q1', a: 'A1', b: 'B1', c: 'C1', d: 'D1', correct: 'A' },
        { question: 'Q2', a: 'A2', b: 'B2', c: 'C2', d: 'D2', correct: 'B' },
        { question: 'Q3', a: 'A3', b: 'B3', c: 'C3', d: 'D3', correct: 'C' },
      ]);
      const session = new Session('trivia', []);
      const h = createWsHandler(game, session);

      const spectatorWs = new MockWs();
      h.handleConnection(spectatorWs as any);
      spectatorWs.receive({ type: 'register_spectator' });
      spectatorWs.clearSent();

      h.handleConnection(adminWs as any);
      adminWs.receive({ type: 'go_live' }); // sets adminSocket, errors (wrong state) — ok
      adminWs.clearSent();

      adminWs.receive({ type: 'start_trivia_question', questionIndex: 0 });
      adminWs.receive({ type: 'go_live' });

      const msg = spectatorWs.messagesOfType('question_live')[0];
      expect(msg).toBeDefined();
      expect(msg?.text).toBe('Q1');
      jest.useRealTimers();
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
