// Mock browser globals before importing the module under test.
// ws-client accesses WebSocket/location lazily (inside connect()), so
// setting these here — after the require() — is safe.

class MockWebSocket {
  static readonly OPEN = 1;
  static instances: MockWebSocket[] = [];
  static reset(): void { this.instances = []; }

  url: string;
  readyState = MockWebSocket.OPEN;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose:   (() => void)                          | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }
  send(data: string): void { this.sent.push(data); }
}

(globalThis as Record<string, unknown>).WebSocket  = MockWebSocket;
(globalThis as Record<string, unknown>).location   = { protocol: 'http:', host: 'localhost:3000' };

import { connect, send } from '../ws-client.js';

beforeEach(() => {
  MockWebSocket.reset();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
describe('connect', () => {
  it('opens a WebSocket with a ws:// URL derived from location', () => {
    connect(() => { /* noop */ });
    expect(MockWebSocket.instances.length).toBe(1);
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost:3000');
  });

  it('uses wss:// when the page is served over HTTPS', () => {
    (globalThis as Record<string, unknown>).location = { protocol: 'https:', host: 'example.com' };
    connect(() => { /* noop */ });
    expect(MockWebSocket.instances[0].url).toBe('wss://example.com');
    // restore
    (globalThis as Record<string, unknown>).location = { protocol: 'http:', host: 'localhost:3000' };
  });

  it('invokes the message handler with the parsed JSON payload', () => {
    const handler = jest.fn();
    connect(handler);
    const ws = MockWebSocket.instances[0];
    ws.onmessage!({ data: JSON.stringify({ type: 'game_status', status: 'active' }) });
    expect(handler).toHaveBeenCalledWith({ type: 'game_status', status: 'active' });
  });

  it('reconnects automatically 2 seconds after a close', () => {
    connect(() => { /* noop */ });
    expect(MockWebSocket.instances.length).toBe(1);

    MockWebSocket.instances[0].onclose!();
    jest.advanceTimersByTime(1999);
    expect(MockWebSocket.instances.length).toBe(1); // not yet

    jest.advanceTimersByTime(1);
    expect(MockWebSocket.instances.length).toBe(2); // reconnected
  });

  it('preserves the message handler across reconnects', () => {
    const handler = jest.fn();
    connect(handler);

    MockWebSocket.instances[0].onclose!();
    jest.advanceTimersByTime(2000);

    const newWs = MockWebSocket.instances[1];
    newWs.onmessage!({ data: JSON.stringify({ type: 'error', message: 'oops' }) });
    expect(handler).toHaveBeenCalledWith({ type: 'error', message: 'oops' });
  });
});

// ---------------------------------------------------------------------------
describe('send', () => {
  it('serialises and sends a message over the socket', () => {
    connect(() => { /* noop */ });
    send({ type: 'join', screenName: 'Alice' });
    expect(MockWebSocket.instances[0].sent).toEqual([
      JSON.stringify({ type: 'join', screenName: 'Alice' }),
    ]);
  });

  it('sends multiple messages in order', () => {
    connect(() => { /* noop */ });
    send({ type: 'join', screenName: 'Alice' });
    send({ type: 'mark_word', word: 'synergy' });
    expect(MockWebSocket.instances[0].sent.length).toBe(2);
  });
});
