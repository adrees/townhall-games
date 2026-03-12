import type WebSocket from 'ws';
import { Session } from '../core/session';
import type { GameEvent } from '../core/types';
import { parseCommand, serializeEvent, type ServerEvent } from './protocol';
import { TriviaGame } from '../core/games/trivia';

interface PlayerInfo {
  playerId: string;
  screenName: string;
}

export interface RelayTransport {
  sendToPlayer(connectionId: string, event: string): void;
  broadcastToPlayers(event: string): void;
}

export interface AdminWsHandler {
  handleAdminConnection(ws: WebSocket): void;
  handlePlayerCommand(connectionId: string, rawCommand: string): void;
  handlePlayerConnected(connectionId: string): void;
  handlePlayerDisconnected(connectionId: string): void;
}

export function createAdminWsHandler(relay: RelayTransport, triviaGame: TriviaGame | null = null, injectedSession: Session | null = null): AdminWsHandler {
  let session: Session | null = injectedSession;
  let adminSocket: WebSocket | null = null;
  const connectionToPlayer = new Map<string, PlayerInfo>();
  const playerToConnection = new Map<string, string>();
  let pendingJoinConnectionId: string | null = null;
  let timerHandle: ReturnType<typeof setTimeout> | null = null;

  function sendToAdmin(event: ServerEvent): void {
    if (adminSocket) {
      try {
        if (adminSocket.readyState === adminSocket.OPEN) adminSocket.send(serializeEvent(event));
      } catch { /* swallow */ }
    }
  }

  function sendToPlayer(connectionId: string, event: ServerEvent): void {
    relay.sendToPlayer(connectionId, serializeEvent(event));
  }

  function broadcastToAll(event: ServerEvent): void {
    relay.broadcastToPlayers(serializeEvent(event));
    sendToAdmin(event);
  }

  function handleSessionEvent(event: GameEvent): void {
    switch (event.type) {
      case 'game_started':
      case 'new_round_started': {
        const connId = playerToConnection.get(event.playerId) ?? pendingJoinConnectionId;
        if (connId) {
          sendToPlayer(connId, { type: 'card_dealt', roundNumber: event.roundNumber, grid: event.playerCard.getGrid(), marked: event.playerCard.getMarked() });
        }
        broadcastToAll({ type: 'game_status', status: session!.getGameStatus(), round: session!.getCurrentRound() });
        broadcastToAll({ type: 'leaderboard', entries: session!.getLeaderboard() });
        break;
      }
      case 'player_won': {
        broadcastToAll({ type: 'player_won', winnerName: event.winnerName, pattern: event.pattern, roundNumber: event.roundNumber });
        broadcastToAll({ type: 'leaderboard', entries: session!.getLeaderboard() });
        broadcastToAll({ type: 'game_status', status: session!.getGameStatus(), round: session!.getCurrentRound() });
        break;
      }
      case 'player_joined': {
        broadcastToAll({ type: 'player_joined', playerId: event.playerId, screenName: event.screenName, playerCount: session!.getPlayers().length });
        break;
      }
      case 'player_left': {
        broadcastToAll({ type: 'player_left', playerId: event.playerId, screenName: event.screenName, playerCount: session!.getPlayers().length });
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

    broadcastToAll({ type: 'answer_revealed', correct: result.correctAnswer, eliminated: result.eliminated, survivors: result.survivors });

    // Per-player individual events
    for (const [connId, info] of connectionToPlayer) {
      if (result.eliminated.includes(info.playerId)) {
        sendToPlayer(connId, { type: 'you_are_eliminated', correctAnswer: result.correctAnswer, yourAnswer: null });
      } else if (result.survivors.includes(info.playerId)) {
        sendToPlayer(connId, { type: 'you_survived', survivorCount: result.survivors.length });
      }
    }

    sendToAdmin({ type: 'question_result', correct: result.correctAnswer, eliminated: result.eliminated, survivors: result.survivors });

    triviaGame.showSurvivors();

    if (triviaGame.state === 'game_over') {
      broadcastToAll({ type: 'game_over', winners: triviaGame.getWinners().map(w => w.screenName) });
    } else {
      const survivorIds = triviaGame.getSurvivors();
      broadcastToAll({ type: 'survivors_regrouped', survivorCount: survivorIds.length, survivorNames: survivorIds });
    }
  }

  function onTimerExpired(): void {
    if (!triviaGame) return;
    triviaGame.expireTimer();
    const round = triviaGame.getCurrentRound()!;
    const counts = round.getAnswerCounts();
    const totalAnswered = counts.A + counts.B + counts.C + counts.D;
    const totalPlayers = triviaGame.getSurvivors().length;

    broadcastToAll({ type: 'timer_expired' });
    broadcastToAll({ type: 'answer_breakdown', counts, totalAnswered, totalPlayers });

    timerHandle = setTimeout(onReveal, TriviaGame.REVEAL_DELAY_MS);
  }

  // ── Bingo admin commands ─────────────────────────────────────────────────

  function handleBingoAdminCommand(raw: string): void {
    const command = parseCommand(raw);
    if (!command) { sendToAdmin({ type: 'error', message: 'Invalid command' }); return; }

    try {
      switch (command.type) {
        case 'create_session': {
          if (session) { sendToAdmin({ type: 'error', message: 'Session already exists' }); return; }
          session = new Session('bingo', command.words);
          session.addEventListener(handleSessionEvent);
          sendToAdmin({ type: 'session_created', sessionId: session.id });
          break;
        }
        case 'start_game': {
          if (!session) { sendToAdmin({ type: 'error', message: 'No session exists' }); return; }
          session.startGame();
          break;
        }
        case 'start_new_round': {
          if (!session) { sendToAdmin({ type: 'error', message: 'No session exists' }); return; }
          session.startNewRound();
          break;
        }
        default:
          sendToAdmin({ type: 'error', message: 'Command not valid for bingo session' });
      }
    } catch (err: unknown) {
      sendToAdmin({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  // ── Trivia admin commands ────────────────────────────────────────────────

  function handleTriviaAdminCommand(raw: string): void {
    const command = parseCommand(raw);
    if (!command) { sendToAdmin({ type: 'error', message: 'Invalid command' }); return; }

    if (!triviaGame) { sendToAdmin({ type: 'error', message: 'No trivia game configured' }); return; }

    try {
      switch (command.type) {
        case 'start_trivia_question': {
          triviaGame.previewQuestion(command.questionIndex);
          const q = triviaGame.getCurrentQuestion()!;
          broadcastToAll({ type: 'question_preview', questionIndex: command.questionIndex, text: q.question });
          break;
        }
        case 'go_live': {
          triviaGame.goLive();
          const q = triviaGame.getCurrentQuestion()!;
          broadcastToAll({ type: 'question_live', text: q.question, options: [q.a, q.b, q.c, q.d], timeLimit: triviaGame.questionTimeLimitMs / 1000 });
          timerHandle = setTimeout(onTimerExpired, triviaGame.questionTimeLimitMs);
          break;
        }
        case 'advance_question': {
          const nextIndex = triviaGame.questions.indexOf(triviaGame.getCurrentQuestion()!) + 1;
          triviaGame.previewQuestion(nextIndex);
          const q = triviaGame.getCurrentQuestion()!;
          broadcastToAll({ type: 'question_preview', questionIndex: nextIndex, text: q.question });
          break;
        }
        default:
          sendToAdmin({ type: 'error', message: 'Command not valid for trivia admin' });
      }
    } catch (err: unknown) {
      sendToAdmin({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  // ── Bingo player commands ────────────────────────────────────────────────

  function handleBingoPlayerCommand(connectionId: string, raw: string): void {
    const command = parseCommand(raw);
    if (!command) { sendToPlayer(connectionId, { type: 'error', message: 'Invalid command' }); return; }

    try {
      switch (command.type) {
        case 'join': {
          if (!session) { sendToPlayer(connectionId, { type: 'error', message: 'No session exists' }); return; }
          pendingJoinConnectionId = connectionId;
          const player = session.addPlayer(command.screenName);
          pendingJoinConnectionId = null;
          connectionToPlayer.set(connectionId, { playerId: player.id, screenName: player.screenName });
          playerToConnection.set(player.id, connectionId);
          sendToPlayer(connectionId, { type: 'joined', playerId: player.id, screenName: player.screenName, gameStatus: session.getGameStatus(), round: session.getCurrentRound() });
          break;
        }
        case 'mark_word': {
          if (!session) { sendToPlayer(connectionId, { type: 'error', message: 'No session exists' }); return; }
          const info = connectionToPlayer.get(connectionId);
          if (!info) { sendToPlayer(connectionId, { type: 'error', message: 'Not joined as a player' }); return; }
          const result = session.markWord(info.playerId, command.word);
          sendToPlayer(connectionId, { type: 'mark_result', success: result.success, word: command.word, bingo: result.bingo, roundOver: result.roundOver });
          break;
        }
        default:
          sendToPlayer(connectionId, { type: 'error', message: 'Command not valid for bingo player' });
      }
    } catch (err: unknown) {
      sendToPlayer(connectionId, { type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  // ── Trivia player commands ───────────────────────────────────────────────

  function handleTriviaPlayerCommand(connectionId: string, raw: string): void {
    const command = parseCommand(raw);
    if (!command) { sendToPlayer(connectionId, { type: 'error', message: 'Invalid command' }); return; }

    try {
      switch (command.type) {
        case 'join': {
          if (!session) { sendToPlayer(connectionId, { type: 'error', message: 'No session exists' }); return; }
          pendingJoinConnectionId = connectionId;
          const player = session.addPlayer(command.screenName);
          pendingJoinConnectionId = null;
          connectionToPlayer.set(connectionId, { playerId: player.id, screenName: player.screenName });
          playerToConnection.set(player.id, connectionId);
          sendToPlayer(connectionId, { type: 'joined', playerId: player.id, screenName: player.screenName, gameStatus: session.getGameStatus(), round: session.getCurrentRound() });
          break;
        }
        case 'submit_answer': {
          if (!triviaGame || triviaGame.state !== 'question_live') return; // silently ignore
          const info = connectionToPlayer.get(connectionId);
          if (!info) { sendToPlayer(connectionId, { type: 'error', message: 'Not joined as a player' }); return; }
          triviaGame.getCurrentRound()?.submitAnswer(info.playerId, command.answer);
          sendToPlayer(connectionId, { type: 'answer_accepted' });
          const counts = triviaGame.getCurrentRound()!.getAnswerCounts();
          const answered = counts.A + counts.B + counts.C + counts.D;
          const remaining = triviaGame.getSurvivors().length - answered;
          sendToAdmin({ type: 'live_answer_stats', counts, answered, remaining });
          break;
        }
        default:
          sendToPlayer(connectionId, { type: 'error', message: 'Command not valid for trivia player' });
      }
    } catch (err: unknown) {
      sendToPlayer(connectionId, { type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return {
    handleAdminConnection(ws: WebSocket): void {
      adminSocket = ws;
      ws.on('message', (data: WebSocket.RawData) => {
        const raw = data.toString();
        if (!session) {
          handleBingoAdminCommand(raw);
          return;
        }
        if (session.gameMode === 'trivia') {
          handleTriviaAdminCommand(raw);
        } else {
          handleBingoAdminCommand(raw);
        }
      });
      ws.on('close', () => {
        if (ws === adminSocket) adminSocket = null;
      });
    },

    handlePlayerCommand(connectionId: string, rawCommand: string): void {
      if (!session) {
        sendToPlayer(connectionId, { type: 'error', message: 'No session exists' });
        return;
      }
      if (session.gameMode === 'trivia') {
        handleTriviaPlayerCommand(connectionId, rawCommand);
      } else {
        handleBingoPlayerCommand(connectionId, rawCommand);
      }
    },

    handlePlayerConnected(_connectionId: string): void {
      // No-op — player hasn't joined yet, just opened a WS
    },

    handlePlayerDisconnected(connectionId: string): void {
      const info = connectionToPlayer.get(connectionId);
      if (info && session) {
        session.removePlayer(info.playerId);
        playerToConnection.delete(info.playerId);
        connectionToPlayer.delete(connectionId);
      }
    },
  };
}
