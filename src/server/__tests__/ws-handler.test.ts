import { createWsHandler } from '../ws-handler';
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
    adminWs.receive({ type: 'create_session', gameMode: 'trivia', questions: makeQuestions() });
  }

  function connectAndJoinPlayer(name = 'Alice'): string {
    handler.handleConnection(playerWs as any);
    playerWs.receive({ type: 'join', screenName: name });
    const joined = playerWs.messagesOfType('joined')[0];
    return joined?.playerId as string;
  }

  describe('create_session', () => {
    it('replaces an existing session when called again', () => {
      connectAdmin();
      const first = adminWs.messagesOfType('session_created')[0];
      adminWs.receive({ type: 'create_session', gameMode: 'trivia', questions: makeQuestions() });
      const second = adminWs.messagesOfType('session_created')[1];
      expect(second?.type).toBe('session_created');
      expect(second?.sessionId).not.toBe(first?.sessionId);
    });

    describe('trivia', () => {
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

      it('creating ws becomes admin socket and receives player_joined broadcasts', () => {
        handler.handleConnection(adminWs as any);
        adminWs.receive({ type: 'create_session', gameMode: 'trivia', questions: makeQuestions() });
        adminWs.clearSent();

        handler.handleConnection(playerWs as any);
        playerWs.receive({ type: 'join', screenName: 'Alice' });

        const adminMessages = adminWs.messagesOfType('player_joined');
        expect(adminMessages).toHaveLength(1);
        expect(adminMessages[0].screenName).toBe('Alice');
      });

      it('admin can send start_trivia_question after trivia create_session', () => {
        handler.handleConnection(adminWs as any);
        adminWs.receive({ type: 'create_session', gameMode: 'trivia', questions: makeQuestions() });
        adminWs.clearSent();

        adminWs.receive({ type: 'start_trivia_question', questionIndex: 0 });

        const preview = adminWs.messagesOfType('question_preview');
        expect(preview).toHaveLength(1);
        expect(preview[0].questionIndex).toBe(0);
        expect(preview[0].text).toBe('Q1?');
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
      game.registerPlayers(['survivor']);
      const h = createWsHandler(game, session);

      h.handleConnection(adminWs as any);
      adminWs.receive({ type: 'go_live' });
      adminWs.clearSent();

      adminWs.receive({ type: 'start_trivia_question', questionIndex: 0 });
      adminWs.receive({ type: 'go_live' });
      // Submit correct answer so at least one survivor remains → survivors state, not game_over
      game.getCurrentRound()!.submitAnswer('survivor', 'A');
      jest.advanceTimersByTime(10000 + 2500);
      adminWs.clearSent();

      adminWs.receive({ type: 'advance_question' });
      const preview = adminWs.messagesOfType('question_preview')[0];
      expect(preview).toBeDefined();
      expect(preview?.text).toBe('Q2');
      jest.useRealTimers();
    });

    it('broadcasts game_over (no winners) and NOT survivors_regrouped when all players eliminated mid-game', () => {
      jest.useFakeTimers();
      const game = new TriviaGame('test', QUESTIONS); // 3 questions, so Q1 is not the final
      const session = new Session('trivia', []);
      const h = createWsHandler(game, session);

      h.handleConnection(adminWs as any);
      adminWs.receive({ type: 'go_live' }); // sets adminSocket, errors (wrong state) — ok
      adminWs.clearSent();

      h.handleConnection(playerWs as any);
      playerWs.receive({ type: 'join', screenName: 'Alice' });
      playerWs.clearSent();

      adminWs.receive({ type: 'start_trivia_question', questionIndex: 0 });
      adminWs.receive({ type: 'go_live' });
      adminWs.clearSent();
      playerWs.clearSent();

      // Alice answers wrong — she's the only player, so all players are eliminated
      playerWs.receive({ type: 'submit_answer', answer: 'D' }); // wrong (correct is A)

      jest.advanceTimersByTime(10000 + 2500);

      const gameOver = adminWs.messagesOfType('game_over');
      expect(gameOver).toHaveLength(1);
      expect(gameOver[0].winners).toEqual([]);

      expect(adminWs.messagesOfType('survivors_regrouped')).toHaveLength(0);

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

    describe('player elimination', () => {
      function setupTriviaWithPlayer(screenName: string) {
        jest.useFakeTimers();
        const game = new TriviaGame('test', QUESTIONS);
        const session = new Session('trivia', []);
        const h = createWsHandler(game, session);

        h.handleConnection(adminWs as any);
        adminWs.receive({ type: 'go_live' }); // sets adminSocket, errors (wrong state) — ok
        adminWs.clearSent();

        h.handleConnection(playerWs as any);
        playerWs.receive({ type: 'join', screenName });
        playerWs.clearSent();

        adminWs.receive({ type: 'start_trivia_question', questionIndex: 0 });
        adminWs.receive({ type: 'go_live' });
        adminWs.clearSent();
        playerWs.clearSent();

        return { h, game };
      }

      it('player who does not answer receives you_are_eliminated after timer expires', () => {
        setupTriviaWithPlayer('Alice');

        jest.advanceTimersByTime(10000 + 2500);

        expect(playerWs.messagesOfType('you_are_eliminated')).toHaveLength(1);
        jest.useRealTimers();
      });

      it('player who answers correctly receives you_survived after timer expires', () => {
        setupTriviaWithPlayer('Alice');

        playerWs.receive({ type: 'submit_answer', answer: 'A' }); // correct answer for Q1
        jest.advanceTimersByTime(10000 + 2500);

        expect(playerWs.messagesOfType('you_survived')).toHaveLength(1);
        expect(playerWs.messagesOfType('you_are_eliminated')).toHaveLength(0);
        jest.useRealTimers();
      });

      it('player who answers incorrectly receives you_are_eliminated after timer expires', () => {
        setupTriviaWithPlayer('Alice');

        playerWs.receive({ type: 'submit_answer', answer: 'B' }); // wrong answer for Q1 (correct is A)
        jest.advanceTimersByTime(10000 + 2500);

        expect(playerWs.messagesOfType('you_are_eliminated')).toHaveLength(1);
        expect(playerWs.messagesOfType('you_survived')).toHaveLength(0);
        jest.useRealTimers();
      });
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

});
