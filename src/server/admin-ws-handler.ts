import type WebSocket from 'ws';
import { Session } from '../core/session';
import type { GameEvent } from '../core/types';
import { parseCommand, serializeEvent, type ServerEvent } from './protocol';

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

export function createAdminWsHandler(relay: RelayTransport): AdminWsHandler {
  let session: Session | null = null;
  let adminSocket: WebSocket | null = null;
  const connectionToPlayer = new Map<string, PlayerInfo>();
  const playerToConnection = new Map<string, string>();
  let pendingJoinConnectionId: string | null = null;

  function sendToAdmin(event: ServerEvent): void {
    if (adminSocket) {
      try {
        if (adminSocket.readyState === adminSocket.OPEN) {
          adminSocket.send(serializeEvent(event));
        }
      } catch {
        // Swallow
      }
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
          sendToPlayer(connId, {
            type: 'card_dealt',
            roundNumber: event.roundNumber,
            grid: event.playerCard.getGrid(),
            marked: event.playerCard.getMarked(),
          });
        }
        broadcastToAll({
          type: 'game_status',
          status: session!.getGameStatus(),
          round: session!.getCurrentRound(),
        });
        broadcastToAll({
          type: 'leaderboard',
          entries: session!.getLeaderboard(),
        });
        break;
      }

      case 'player_won': {
        broadcastToAll({
          type: 'player_won',
          winnerName: event.winnerName,
          pattern: event.pattern,
          roundNumber: event.roundNumber,
        });
        broadcastToAll({
          type: 'leaderboard',
          entries: session!.getLeaderboard(),
        });
        broadcastToAll({
          type: 'game_status',
          status: session!.getGameStatus(),
          round: session!.getCurrentRound(),
        });
        break;
      }

      case 'player_joined': {
        broadcastToAll({
          type: 'player_joined',
          playerId: event.playerId,
          screenName: event.screenName,
          playerCount: session!.getPlayers().length,
        });
        break;
      }

      case 'player_left': {
        broadcastToAll({
          type: 'player_left',
          playerId: event.playerId,
          screenName: event.screenName,
          playerCount: session!.getPlayers().length,
        });
        break;
      }
    }
  }

  function handleAdminMessage(ws: WebSocket, raw: string): void {
    const command = parseCommand(raw);
    if (!command) {
      sendToAdmin({ type: 'error', message: 'Invalid command' });
      return;
    }

    try {
      switch (command.type) {
        case 'create_session': {
          if (session) {
            sendToAdmin({ type: 'error', message: 'Session already exists' });
            return;
          }
          session = new Session(command.words);
          session.addEventListener(handleSessionEvent);
          adminSocket = ws;
          sendToAdmin({ type: 'session_created', sessionId: session.id });
          break;
        }

        case 'start_game': {
          if (!session) {
            sendToAdmin({ type: 'error', message: 'No session exists' });
            return;
          }
          session.startGame();
          break;
        }

        case 'start_new_round': {
          if (!session) {
            sendToAdmin({ type: 'error', message: 'No session exists' });
            return;
          }
          session.startNewRound();
          break;
        }

        default: {
          sendToAdmin({ type: 'error', message: 'Admin cannot send player commands' });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      sendToAdmin({ type: 'error', message });
    }
  }

  return {
    handleAdminConnection(ws: WebSocket): void {
      adminSocket = ws;
      ws.on('message', (data: WebSocket.RawData) => {
        handleAdminMessage(ws, data.toString());
      });
      ws.on('close', () => {
        if (ws === adminSocket) {
          adminSocket = null;
        }
      });
    },

    handlePlayerCommand(connectionId: string, rawCommand: string): void {
      const command = parseCommand(rawCommand);
      if (!command) {
        sendToPlayer(connectionId, { type: 'error', message: 'Invalid command' });
        return;
      }

      try {
        switch (command.type) {
          case 'join': {
            if (!session) {
              sendToPlayer(connectionId, { type: 'error', message: 'No session exists' });
              return;
            }
            pendingJoinConnectionId = connectionId;
            const player = session.addPlayer(command.screenName);
            pendingJoinConnectionId = null;
            connectionToPlayer.set(connectionId, { playerId: player.id, screenName: player.screenName });
            playerToConnection.set(player.id, connectionId);
            sendToPlayer(connectionId, {
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
              sendToPlayer(connectionId, { type: 'error', message: 'No session exists' });
              return;
            }
            const info = connectionToPlayer.get(connectionId);
            if (!info) {
              sendToPlayer(connectionId, { type: 'error', message: 'Not joined as a player' });
              return;
            }
            const result = session.markWord(info.playerId, command.word);
            sendToPlayer(connectionId, {
              type: 'mark_result',
              success: result.success,
              word: command.word,
              bingo: result.bingo,
              roundOver: result.roundOver,
            });
            break;
          }

          default: {
            sendToPlayer(connectionId, { type: 'error', message: 'Players can only join or mark words' });
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        sendToPlayer(connectionId, { type: 'error', message });
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
