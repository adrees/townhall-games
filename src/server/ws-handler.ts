import type WebSocket from 'ws';
import { Session } from '../core/session';
import type { GameEvent } from '../core/types';
import { parseCommand, serializeEvent, type ServerEvent } from './protocol';

interface PlayerInfo {
  playerId: string;
  screenName: string;
}

export interface WsHandler {
  handleConnection(ws: WebSocket): void;
}

export function createWsHandler(): WsHandler {
  let session: Session | null = null;
  let adminSocket: WebSocket | null = null;
  const socketToPlayer = new Map<WebSocket, PlayerInfo>();
  const playerToSocket = new Map<string, WebSocket>();
  let pendingJoinSocket: WebSocket | null = null;

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
        if (ws.readyState === ws.OPEN) {
          ws.send(data);
        }
      } catch {
        // Swallow
      }
    }
    // Also send to admin
    if (adminSocket) {
      try {
        if (adminSocket.readyState === adminSocket.OPEN) {
          adminSocket.send(data);
        }
      } catch {
        // Swallow
      }
    }
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
        broadcast({
          type: 'game_status',
          status: session!.getGameStatus(),
          round: session!.getCurrentRound(),
        });
        broadcast({
          type: 'leaderboard',
          entries: session!.getLeaderboard(),
        });
        break;
      }

      case 'player_won': {
        broadcast({
          type: 'player_won',
          winnerName: event.winnerName,
          pattern: event.pattern,
          roundNumber: event.roundNumber,
        });
        broadcast({
          type: 'leaderboard',
          entries: session!.getLeaderboard(),
        });
        broadcast({
          type: 'game_status',
          status: session!.getGameStatus(),
          round: session!.getCurrentRound(),
        });
        break;
      }

      case 'player_joined': {
        broadcast({
          type: 'player_joined',
          playerId: event.playerId,
          screenName: event.screenName,
          playerCount: session!.getPlayers().length,
        });
        break;
      }

      case 'player_left': {
        broadcast({
          type: 'player_left',
          playerId: event.playerId,
          screenName: event.screenName,
          playerCount: session!.getPlayers().length,
        });
        break;
      }
    }
  }

  function handleMessage(ws: WebSocket, raw: string): void {
    const command = parseCommand(raw);
    if (!command) {
      send(ws, { type: 'error', message: 'Invalid command' });
      return;
    }

    try {
      switch (command.type) {
        case 'create_session': {
          if (session) {
            send(ws, { type: 'error', message: 'Session already exists' });
            return;
          }
          session = new Session(command.words);
          session.addEventListener(handleSessionEvent);
          adminSocket = ws;
          send(ws, { type: 'session_created', sessionId: session.id });
          break;
        }

        case 'start_game': {
          if (!session) {
            send(ws, { type: 'error', message: 'No session exists' });
            return;
          }
          if (ws !== adminSocket) {
            send(ws, { type: 'error', message: 'Only admin can start the game' });
            return;
          }
          session.startGame();
          break;
        }

        case 'start_new_round': {
          if (!session) {
            send(ws, { type: 'error', message: 'No session exists' });
            return;
          }
          if (ws !== adminSocket) {
            send(ws, { type: 'error', message: 'Only admin can start a new round' });
            return;
          }
          session.startNewRound();
          break;
        }

        case 'join': {
          if (!session) {
            send(ws, { type: 'error', message: 'No session exists' });
            return;
          }
          pendingJoinSocket = ws;
          const player = session.addPlayer(command.screenName);
          pendingJoinSocket = null;
          socketToPlayer.set(ws, { playerId: player.id, screenName: player.screenName });
          playerToSocket.set(player.id, ws);
          send(ws, {
            type: 'joined',
            playerId: player.id,
            screenName: player.screenName,
            gameStatus: session.getGameStatus(),
            round: session.getCurrentRound(),
          });
          break;
        }

        case 'mark_word': {
          if (!session) {
            send(ws, { type: 'error', message: 'No session exists' });
            return;
          }
          const info = socketToPlayer.get(ws);
          if (!info) {
            send(ws, { type: 'error', message: 'Not joined as a player' });
            return;
          }
          const result = session.markWord(info.playerId, command.word);
          send(ws, {
            type: 'mark_result',
            success: result.success,
            word: command.word,
            bingo: result.bingo,
            roundOver: result.roundOver,
          });
          break;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      send(ws, { type: 'error', message });
    }
  }

  function handleClose(ws: WebSocket): void {
    const info = socketToPlayer.get(ws);
    if (info && session) {
      session.removePlayer(info.playerId);
      playerToSocket.delete(info.playerId);
      socketToPlayer.delete(ws);
    }
    if (ws === adminSocket) {
      adminSocket = null;
    }
  }

  return {
    handleConnection(ws: WebSocket): void {
      ws.on('message', (data: WebSocket.RawData) => {
        handleMessage(ws, data.toString());
      });
      ws.on('close', () => {
        handleClose(ws);
      });
    },
  };
}
