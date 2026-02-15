// Relay envelope protocol for admin ↔ cloud WebSocket multiplexing

// Admin → Cloud: registration handshake
export interface AdminRegisterMessage {
  envelope: 'admin_register';
  sessionId: string;
  secret: string;
}

export interface AdminRegisteredMessage {
  envelope: 'admin_registered';
  sessionId: string;
}

export interface AdminErrorMessage {
  envelope: 'admin_error';
  message: string;
}

// Cloud → Admin: player connection lifecycle
export interface PlayerConnectedMessage {
  envelope: 'player_connected';
  connectionId: string;
}

export interface PlayerDisconnectedMessage {
  envelope: 'player_disconnected';
  connectionId: string;
}

export interface PlayerRosterMessage {
  envelope: 'player_roster';
  connections: string[];
}

// Cloud → Admin: player command forwarding
export interface UpstreamMessage {
  envelope: 'upstream';
  connectionId: string;
  command: string; // raw JSON of a player Command
}

// Admin → Cloud: event forwarding
export interface DownstreamMessage {
  envelope: 'downstream';
  target: string; // connectionId
  event: string;  // raw JSON of a ServerEvent
}

export interface BroadcastMessage {
  envelope: 'broadcast';
  event: string; // raw JSON of a ServerEvent
}

export type RelayMessage =
  | AdminRegisterMessage
  | AdminRegisteredMessage
  | AdminErrorMessage
  | PlayerConnectedMessage
  | PlayerDisconnectedMessage
  | PlayerRosterMessage
  | UpstreamMessage
  | DownstreamMessage
  | BroadcastMessage;

export function serializeRelayMessage(msg: RelayMessage): string {
  return JSON.stringify(msg);
}

export function parseRelayMessage(raw: string): RelayMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;

  const obj = parsed as Record<string, unknown>;
  const envelope = obj.envelope;

  switch (envelope) {
    case 'admin_register':
      if (typeof obj.sessionId !== 'string' || typeof obj.secret !== 'string') return null;
      return { envelope: 'admin_register', sessionId: obj.sessionId, secret: obj.secret };

    case 'admin_registered':
      if (typeof obj.sessionId !== 'string') return null;
      return { envelope: 'admin_registered', sessionId: obj.sessionId };

    case 'admin_error':
      if (typeof obj.message !== 'string') return null;
      return { envelope: 'admin_error', message: obj.message };

    case 'upstream':
      if (typeof obj.connectionId !== 'string' || typeof obj.command !== 'string') return null;
      return { envelope: 'upstream', connectionId: obj.connectionId, command: obj.command };

    case 'downstream':
      if (typeof obj.target !== 'string' || typeof obj.event !== 'string') return null;
      return { envelope: 'downstream', target: obj.target, event: obj.event };

    case 'broadcast':
      if (typeof obj.event !== 'string') return null;
      return { envelope: 'broadcast', event: obj.event };

    case 'player_connected':
      if (typeof obj.connectionId !== 'string') return null;
      return { envelope: 'player_connected', connectionId: obj.connectionId };

    case 'player_disconnected':
      if (typeof obj.connectionId !== 'string') return null;
      return { envelope: 'player_disconnected', connectionId: obj.connectionId };

    case 'player_roster':
      if (!Array.isArray(obj.connections) || !obj.connections.every((c: unknown) => typeof c === 'string')) return null;
      return { envelope: 'player_roster', connections: obj.connections as string[] };

    default:
      return null;
  }
}
