import * as http from 'http';
import { handleVersionRequest } from '../version-handler';

function makeReq(): http.IncomingMessage {
  return {} as http.IncomingMessage;
}

function makeRes() {
  return {
    writeHead: jest.fn(),
    end: jest.fn(),
  } as unknown as http.ServerResponse;
}

describe('handleVersionRequest', () => {
  it('responds 200 with application/json content type', () => {
    const res = makeRes();
    handleVersionRequest(makeReq(), res, 'abc123', '2026-01-01T00:00:00.000Z');
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
  });

  it('returns sha and startedAt in the response body', () => {
    const res = makeRes();
    handleVersionRequest(makeReq(), res, 'abc123', '2026-01-01T00:00:00.000Z');
    const body = JSON.parse((res.end as jest.Mock).mock.calls[0][0]);
    expect(body.sha).toBe('abc123');
    expect(body.startedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns "unknown" as sha when env var was absent', () => {
    const res = makeRes();
    handleVersionRequest(makeReq(), res, 'unknown', '2026-01-01T00:00:00.000Z');
    const body = JSON.parse((res.end as jest.Mock).mock.calls[0][0]);
    expect(body.sha).toBe('unknown');
  });
});
