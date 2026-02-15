import {
  parseRelayMessage,
  serializeRelayMessage,
  type RelayMessage,
} from '../relay-protocol';

describe('relay-protocol', () => {
  describe('serializeRelayMessage', () => {
    it('serializes an admin_register message', () => {
      const msg: RelayMessage = {
        envelope: 'admin_register',
        sessionId: 'sess-1',
        secret: 'my-secret',
      };
      const json = serializeRelayMessage(msg);
      expect(JSON.parse(json)).toEqual(msg);
    });

    it('serializes a downstream targeted message', () => {
      const msg: RelayMessage = {
        envelope: 'downstream',
        target: 'conn-1',
        event: '{"type":"joined"}',
      };
      expect(JSON.parse(serializeRelayMessage(msg))).toEqual(msg);
    });

    it('serializes a broadcast message', () => {
      const msg: RelayMessage = {
        envelope: 'broadcast',
        event: '{"type":"game_status"}',
      };
      expect(JSON.parse(serializeRelayMessage(msg))).toEqual(msg);
    });
  });

  describe('parseRelayMessage', () => {
    it('parses admin_register', () => {
      const raw = JSON.stringify({ envelope: 'admin_register', sessionId: 's1', secret: 'sec' });
      const msg = parseRelayMessage(raw);
      expect(msg).toEqual({ envelope: 'admin_register', sessionId: 's1', secret: 'sec' });
    });

    it('parses admin_registered', () => {
      const raw = JSON.stringify({ envelope: 'admin_registered', sessionId: 's1' });
      expect(parseRelayMessage(raw)).toEqual({ envelope: 'admin_registered', sessionId: 's1' });
    });

    it('parses admin_error', () => {
      const raw = JSON.stringify({ envelope: 'admin_error', message: 'bad secret' });
      expect(parseRelayMessage(raw)).toEqual({ envelope: 'admin_error', message: 'bad secret' });
    });

    it('parses upstream', () => {
      const raw = JSON.stringify({ envelope: 'upstream', connectionId: 'c1', command: '{"type":"join"}' });
      expect(parseRelayMessage(raw)).toEqual({ envelope: 'upstream', connectionId: 'c1', command: '{"type":"join"}' });
    });

    it('parses downstream', () => {
      const raw = JSON.stringify({ envelope: 'downstream', target: 'c1', event: '{"type":"joined"}' });
      expect(parseRelayMessage(raw)).toEqual({ envelope: 'downstream', target: 'c1', event: '{"type":"joined"}' });
    });

    it('parses broadcast', () => {
      const raw = JSON.stringify({ envelope: 'broadcast', event: '{"type":"game_status"}' });
      expect(parseRelayMessage(raw)).toEqual({ envelope: 'broadcast', event: '{"type":"game_status"}' });
    });

    it('parses player_connected', () => {
      const raw = JSON.stringify({ envelope: 'player_connected', connectionId: 'c1' });
      expect(parseRelayMessage(raw)).toEqual({ envelope: 'player_connected', connectionId: 'c1' });
    });

    it('parses player_disconnected', () => {
      const raw = JSON.stringify({ envelope: 'player_disconnected', connectionId: 'c1' });
      expect(parseRelayMessage(raw)).toEqual({ envelope: 'player_disconnected', connectionId: 'c1' });
    });

    it('parses player_roster', () => {
      const raw = JSON.stringify({ envelope: 'player_roster', connections: ['c1', 'c2'] });
      expect(parseRelayMessage(raw)).toEqual({ envelope: 'player_roster', connections: ['c1', 'c2'] });
    });

    it('returns null for invalid JSON', () => {
      expect(parseRelayMessage('not json')).toBeNull();
    });

    it('returns null for unknown envelope type', () => {
      expect(parseRelayMessage(JSON.stringify({ envelope: 'unknown' }))).toBeNull();
    });

    it('returns null for missing required fields', () => {
      expect(parseRelayMessage(JSON.stringify({ envelope: 'admin_register' }))).toBeNull();
      expect(parseRelayMessage(JSON.stringify({ envelope: 'upstream', connectionId: 'c1' }))).toBeNull();
      expect(parseRelayMessage(JSON.stringify({ envelope: 'downstream', target: 'c1' }))).toBeNull();
      expect(parseRelayMessage(JSON.stringify({ envelope: 'broadcast' }))).toBeNull();
    });

    it('returns null for non-object input', () => {
      expect(parseRelayMessage(JSON.stringify('just a string'))).toBeNull();
      expect(parseRelayMessage(JSON.stringify(42))).toBeNull();
      expect(parseRelayMessage(JSON.stringify(null))).toBeNull();
    });
  });

  describe('round-trip', () => {
    it('serialize then parse returns equivalent message', () => {
      const messages: RelayMessage[] = [
        { envelope: 'admin_register', sessionId: 's1', secret: 'sec' },
        { envelope: 'admin_registered', sessionId: 's1' },
        { envelope: 'admin_error', message: 'nope' },
        { envelope: 'upstream', connectionId: 'c1', command: '{"type":"join"}' },
        { envelope: 'downstream', target: 'c1', event: '{"type":"joined"}' },
        { envelope: 'broadcast', event: '{"type":"game_status"}' },
        { envelope: 'player_connected', connectionId: 'c1' },
        { envelope: 'player_disconnected', connectionId: 'c1' },
        { envelope: 'player_roster', connections: ['c1', 'c2'] },
      ];
      for (const msg of messages) {
        const parsed = parseRelayMessage(serializeRelayMessage(msg));
        expect(parsed).toEqual(msg);
      }
    });
  });
});
