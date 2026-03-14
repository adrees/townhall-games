import type WebSocket from 'ws';
import { Session } from '../core/session';
import type { GameEvent } from '../core/types';
import { parseCommand, serializeEvent, type ServerEvent } from './protocol';
import { TriviaGame } from '../core/games/trivia';

interface PlayerInfo {
  playerId: string;
  screenName: string;
}

export interface WsHandler {
  handleConnection(ws: WebSocket): void;
}

export function createWsHandler(injectedTriviaGame: TriviaGame | null = null, injectedSession: Session | null = null): WsHandler {
  let triviaGame: TriviaGame | null = injectedTriviaGame;
  let session: Session | null = injectedSession;
  let adminSocket: WebSocket | null = null;
  const socketToPlayer = new Map<WebSocket, PlayerInfo>();
  const playerToSocket = new Map<string, WebSocket>();
  const spectatorSockets = new Set<WebSocket>();
  let pendingJoinSocket: WebSocket | null = null;
  let timerHandle: ReturnType<typeof setTimeout> | null = null;

  function send(ws: WebSocket, event: ServerEvent): void {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(serializeEvent(event));
      }
    } catch {
      // Swallow send errors
    }
  }

  function broadcast(event: ServerEvent): void {
    const data = serializeEvent(event);
    for (const ws of socketToPlayer.keys()) {
      try {
        if (ws.readyState === ws.OPEN) ws.send(data);
      } catch { /* swallow */ }
    }
    if (adminSocket) {
      try {
        if (adminSocket.readyState === adminSocket.OPEN) adminSocket.send(data);
      } catch { /* swallow */ }
    }
    for (const ws of spectatorSockets) {
      try {
        if (ws.readyState === ws.OPEN) ws.send(data);
      } catch { /* swallow */ }
    }
  }

  function sendToAdmin(event: ServerEvent): void {
    if (adminSocket) send(adminSocket, event);
  }

  function handleSessionEvent(event: GameEvent): void {
    switch (event.type) {
      case 'game_started':
      case 'new_round_started': {
        const ws = playerToSocket.get(event.playerId) ?? pendingJoinSocket;
        if (ws) {
          send(ws, {
            type: 'card_dealt',
            roundNumber: event.roundNumber,
            grid: event.playerCard.getGrid(),
            marked: event.playerCard.getMarked(),
          });
        }
        broadcast({ type: 'game_status', status: session!.getGameStatus(), round: session!.getCurrentRound() });
        broadcast({ type: 'leaderboard', entries: session!.getLeaderboard() });
        break;
      }
      case 'player_won': {
        broadcast({ type: 'player_won', winnerName: event.winnerName, pattern: event.pattern, roundNumber: event.roundNumber });
        broadcast({ type: 'leaderboard', entries: session!.getLeaderboard() });
        broadcast({ type: 'game_status', status: session!.getGameStatus(), round: session!.getCurrentRound() });
        break;
      }
      case 'player_joined': {
        broadcast({ type: 'player_joined', playerId: event.playerId, screenName: event.screenName, playerCount: session!.getPlayers().length });
        break;
      }
      case 'player_left': {
        broadcast({ type: 'player_left', playerId: event.playerId, screenName: event.screenName, playerCount: session!.getPlayers().length });
        break;
      }
    }
  }

  // ── Trivia auto-sequencing ───────────────────────────────────────────────

  function onReveal(): void {
    if (!triviaGame) return;
    triviaGame.revealAnswer();
    const round = triviaGame.getCurrentRound()!;
    const result = round.getResult();

    broadcast({ type: 'answer_revealed', correct: result.correctAnswer, eliminated: result.eliminated, survivors: result.survivors });

    // Per-player individual events
    for (const [ws, info] of socketToPlayer) {
      if (result.eliminated.includes(info.playerId)) {
        const yourAnswer = round.getAnswerCounts(); // we need the raw answers — use elimination indicator
        send(ws, { type: 'you_are_eliminated', correctAnswer: result.correctAnswer, yourAnswer: null });
      } else if (result.survivors.includes(info.playerId)) {
        send(ws, { type: 'you_survived', survivorCount: result.survivors.length });
      }
    }

    sendToAdmin({ type: 'question_result', correct: result.correctAnswer, eliminated: result.eliminated, survivors: result.survivors });

    triviaGame.showSurvivors();

    if (triviaGame.state === 'game_over') {
      broadcast({ type: 'game_over', winners: triviaGame.getWinners().map(w => w.screenName) });
    } else {
      const survivorNames = triviaGame.getSurvivors(); // ids — in a real game map to screen names; use ids for now
      broadcast({ type: 'survivors_regrouped', survivorCount: survivorNames.length, survivorNames });
    }
  }

  function onTimerExpired(): void {
    if (!triviaGame) return;
    triviaGame.expireTimer();
    const round = triviaGame.getCurrentRound()!;
    const counts = round.getAnswerCounts();
    const totalAnswered = counts.A + counts.B + counts.C + counts.D;
    const totalPlayers = triviaGame.getSurvivors().length;

    broadcast({ type: 'timer_expired' });
    broadcast({ type: 'answer_breakdown', counts, totalAnswered, totalPlayers });

    timerHandle = setTimeout(onReveal, TriviaGame.REVEAL_DELAY_MS);
  }

  // ── Bingo admin commands ─────────────────────────────────────────────────

  function handleBingoAdminCommand(ws: WebSocket, raw: string): void {
    const command = parseCommand(raw);
    if (!command) { send(ws, { type: 'error', message: 'Invalid command' }); return; }

    try {
      switch (command.type) {
        case 'create_session': {
          if (session) { send(ws, { type: 'error', message: 'Session already exists' }); return; }
          if (command.gameMode === 'trivia') {
            session = new Session('trivia', []);
            triviaGame = new TriviaGame(session.id, command.questions, { speedMode: command.speed });
          } else {
            session = new Session('bingo', command.words);
          }
          session.addEventListener(handleSessionEvent);
          adminSocket = ws;
          send(ws, { type: 'session_created', sessionId: session.id });
          break;
        }
        case 'start_game': {
          if (!session) { send(ws, { type: 'error', message: 'No session exists' }); return; }
          if (ws !== adminSocket) { send(ws, { type: 'error', message: 'Only admin can start the game' }); return; }
          session.startGame();
          break;
        }
        case 'start_new_round': {
          if (!session) { send(ws, { type: 'error', message: 'No session exists' }); return; }
          if (ws !== adminSocket) { send(ws, { type: 'error', message: 'Only admin can start a new round' }); return; }
          session.startNewRound();
          break;
        }
        default:
          send(ws, { type: 'error', message: 'Command not valid for bingo session' });
      }
    } catch (err: unknown) {
      send(ws, { type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  // ── Trivia admin commands ────────────────────────────────────────────────

  function handleTriviaAdminCommand(ws: WebSocket, raw: string): void {
    const command = parseCommand(raw);
    if (!command) { send(ws, { type: 'error', message: 'Invalid command' }); return; }

    if (!triviaGame) { send(ws, { type: 'error', message: 'No trivia game configured' }); return; }

    try {
      switch (command.type) {
        case 'start_trivia_question': {
          triviaGame.previewQuestion(command.questionIndex);
          const q = triviaGame.getCurrentQuestion()!;
          broadcast({ type: 'question_preview', questionIndex: command.questionIndex, text: q.question });
          break;
        }
        case 'go_live': {
          triviaGame.goLive();
          const q = triviaGame.getCurrentQuestion()!;
          broadcast({ type: 'question_live', text: q.question, options: [q.a, q.b, q.c, q.d], timeLimit: triviaGame.questionTimeLimitMs / 1000 });
          timerHandle = setTimeout(onTimerExpired, triviaGame.questionTimeLimitMs);
          break;
        }
        case 'advance_question': {
          const nextIndex = triviaGame.questions.indexOf(triviaGame.getCurrentQuestion()!) + 1;
          triviaGame.previewQuestion(nextIndex);
          const q = triviaGame.getCurrentQuestion()!;
          broadcast({ type: 'question_preview', questionIndex: nextIndex, text: q.question });
          break;
        }
        default:
          send(ws, { type: 'error', message: 'Command not valid for trivia admin' });
      }
    } catch (err: unknown) {
      send(ws, { type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  // ── Bingo player commands ────────────────────────────────────────────────

  function handleBingoPlayerCommand(ws: WebSocket, raw: string): void {
    const command = parseCommand(raw);
    if (!command) { send(ws, { type: 'error', message: 'Invalid command' }); return; }

    try {
      switch (command.type) {
        case 'join': {
          if (!session) { send(ws, { type: 'error', message: 'No session exists' }); return; }
          pendingJoinSocket = ws;
          const player = session.addPlayer(command.screenName);
          pendingJoinSocket = null;
          socketToPlayer.set(ws, { playerId: player.id, screenName: player.screenName });
          playerToSocket.set(player.id, ws);
          send(ws, { type: 'joined', playerId: player.id, screenName: player.screenName, gameStatus: session.getGameStatus(), round: session.getCurrentRound() });
          break;
        }
        case 'mark_word': {
          if (!session) { send(ws, { type: 'error', message: 'No session exists' }); return; }
          const info = socketToPlayer.get(ws);
          if (!info) { send(ws, { type: 'error', message: 'Not joined as a player' }); return; }
          const result = session.markWord(info.playerId, command.word);
          send(ws, { type: 'mark_result', success: result.success, word: command.word, bingo: result.bingo, roundOver: result.roundOver });
          break;
        }
        default:
          send(ws, { type: 'error', message: 'Command not valid for bingo player' });
      }
    } catch (err: unknown) {
      send(ws, { type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  // ── Trivia player commands ───────────────────────────────────────────────

  function handleTriviaPlayerCommand(ws: WebSocket, raw: string): void {
    const command = parseCommand(raw);
    if (!command) { send(ws, { type: 'error', message: 'Invalid command' }); return; }

    try {
      switch (command.type) {
        case 'join': {
          if (!session) { send(ws, { type: 'error', message: 'No session exists' }); return; }
          pendingJoinSocket = ws;
          const player = session.addPlayer(command.screenName);
          pendingJoinSocket = null;
          socketToPlayer.set(ws, { playerId: player.id, screenName: player.screenName });
          playerToSocket.set(player.id, ws);
          send(ws, { type: 'joined', playerId: player.id, screenName: player.screenName, gameStatus: session.getGameStatus(), round: session.getCurrentRound() });
          break;
        }
        case 'submit_answer': {
          if (!triviaGame || triviaGame.state !== 'question_live') return; // silently ignore
          const info = socketToPlayer.get(ws);
          if (!info) { send(ws, { type: 'error', message: 'Not joined as a player' }); return; }
          triviaGame.getCurrentRound()?.submitAnswer(info.playerId, command.answer);
          send(ws, { type: 'answer_accepted' });
          // Stream live stats to admin
          const counts = triviaGame.getCurrentRound()!.getAnswerCounts();
          const answered = counts.A + counts.B + counts.C + counts.D;
          const remaining = triviaGame.getSurvivors().length - answered;
          sendToAdmin({ type: 'live_answer_stats', counts, answered, remaining });
          break;
        }
        default:
          send(ws, { type: 'error', message: 'Command not valid for trivia player' });
      }
    } catch (err: unknown) {
      send(ws, { type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  // ── Message routing ──────────────────────────────────────────────────────

  function handleMessage(ws: WebSocket, raw: string): void {
    const cmd = parseCommand(raw);
    if (cmd?.type === 'register_spectator') {
      spectatorSockets.add(ws);
      return;
    }

    // Session creation (or first admin contact for pre-injected trivia session)
    if (!session) {
      handleBingoAdminCommand(ws, raw);
      return;
    }

    // For injected trivia sessions, first non-player message sets adminSocket
    if (session.gameMode === 'trivia' && adminSocket === null) {
      const cmd = parseCommand(raw);
      if (cmd && cmd.type !== 'join' && cmd.type !== 'submit_answer') {
        adminSocket = ws;
      }
    }

    const isAdmin = ws === adminSocket;
    const gameMode = session.gameMode;

    if (isAdmin) {
      if (gameMode === 'trivia') {
        handleTriviaAdminCommand(ws, raw);
      } else {
        handleBingoAdminCommand(ws, raw);
      }
    } else {
      if (gameMode === 'trivia') {
        handleTriviaPlayerCommand(ws, raw);
      } else {
        handleBingoPlayerCommand(ws, raw);
      }
    }
  }

  function handleClose(ws: WebSocket): void {
    const info = socketToPlayer.get(ws);
    if (info && session) {
      session.removePlayer(info.playerId);
      playerToSocket.delete(info.playerId);
      socketToPlayer.delete(ws);
    }
    if (ws === adminSocket) adminSocket = null;
    spectatorSockets.delete(ws);
  }

  return {
    handleConnection(ws: WebSocket): void {
      ws.on('message', (data: WebSocket.RawData) => handleMessage(ws, data.toString()));
      ws.on('close', () => handleClose(ws));
    },
  };
}
