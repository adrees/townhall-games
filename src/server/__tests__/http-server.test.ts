import * as http from 'http';
import * as fs from 'fs';
import { handleStaticRequest } from '../http-server';

jest.mock('fs');

const mockReadFile = fs.readFile as unknown as jest.Mock;

const PUBLIC_DIR = '/fake/public';

function makeReq(url: string): http.IncomingMessage {
  return { url } as http.IncomingMessage;
}

function makeRes() {
  return {
    writeHead: jest.fn(),
    end: jest.fn(),
  } as unknown as http.ServerResponse;
}

function simulateReadFile(data: Buffer | null, err: NodeJS.ErrnoException | null = null) {
  mockReadFile.mockImplementation((_path: string, cb: (err: NodeJS.ErrnoException | null, data?: Buffer) => void) => {
    cb(err, data ?? undefined);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Named HTML/CSS routes
// ---------------------------------------------------------------------------

describe('named routes — unified role', () => {
  it('GET / → 200 text/html serving index.html', () => {
    const data = Buffer.from('<html>index</html>');
    simulateReadFile(data);
    const req = makeReq('/');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'unified');

    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('index.html'),
      expect.any(Function),
    );
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/html; charset=utf-8' });
    expect(res.end).toHaveBeenCalledWith(data);
  });

  it('GET /admin → 200 text/html serving admin.html', () => {
    const data = Buffer.from('<html>admin</html>');
    simulateReadFile(data);
    const req = makeReq('/admin');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'unified');

    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('admin.html'),
      expect.any(Function),
    );
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/html; charset=utf-8' });
    expect(res.end).toHaveBeenCalledWith(data);
  });

  it('GET /style.css → 200 text/css', () => {
    const data = Buffer.from('body {}');
    simulateReadFile(data);
    const req = makeReq('/style.css');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'unified');

    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('style.css'),
      expect.any(Function),
    );
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/css; charset=utf-8' });
    expect(res.end).toHaveBeenCalledWith(data);
  });

  it('fs error on named route → 500', () => {
    const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' }) as NodeJS.ErrnoException;
    simulateReadFile(null, err);
    const req = makeReq('/');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'unified');

    expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'text/plain' });
    expect(res.end).toHaveBeenCalledWith('Internal Server Error');
  });
});

describe('named routes — role restrictions', () => {
  it('GET /admin with relay role → 404 (not in relay allowlist)', () => {
    const req = makeReq('/admin');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'relay');

    expect(mockReadFile).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'text/plain' });
  });

  it('GET / with admin role → 404 (not in admin allowlist)', () => {
    const req = makeReq('/');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'admin');

    expect(mockReadFile).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'text/plain' });
  });

  it('GET /admin with admin role → 200', () => {
    const data = Buffer.from('<html>admin</html>');
    simulateReadFile(data);
    const req = makeReq('/admin');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'admin');

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/html; charset=utf-8' });
  });

  it('GET / with relay role → 200', () => {
    const data = Buffer.from('<html>index</html>');
    simulateReadFile(data);
    const req = makeReq('/');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'relay');

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/html; charset=utf-8' });
  });
});

// ---------------------------------------------------------------------------
// JS wildcard route
// ---------------------------------------------------------------------------

describe('JS wildcard route', () => {
  it('GET /player.js → 200 application/javascript', () => {
    const data = Buffer.from('export const x = 1;');
    simulateReadFile(data);
    const req = makeReq('/player.js');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'unified');

    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('player.js'),
      expect.any(Function),
    );
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
    });
    expect(res.end).toHaveBeenCalledWith(data);
  });

  it('GET /state.js → 200 application/javascript', () => {
    const data = Buffer.from('export const state = {};');
    simulateReadFile(data);
    const req = makeReq('/state.js');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'unified');

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
    });
  });

  it('directory traversal attempt uses basename only', () => {
    const data = Buffer.from('safe');
    simulateReadFile(data);
    const req = makeReq('/../../../evil.js');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'unified');

    // Must read from publicDir/evil.js, not a traversed path
    const calledPath: string = mockReadFile.mock.calls[0][0];
    expect(calledPath).toBe(`${PUBLIC_DIR}/evil.js`);
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
    });
  });

  it('GET /nonexistent.js → 404 when file missing', () => {
    const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' }) as NodeJS.ErrnoException;
    simulateReadFile(null, err);
    const req = makeReq('/nonexistent.js');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'unified');

    expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'text/plain' });
    expect(res.end).toHaveBeenCalledWith('Not Found');
  });

  it('GET /player.js with admin role → 200 (JS bypass is intentional)', () => {
    const data = Buffer.from('export const x = 1;');
    simulateReadFile(data);
    const req = makeReq('/player.js');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'admin');

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
    });
  });

  it('GET /player.js with relay role → 200 (JS bypass is intentional)', () => {
    const data = Buffer.from('export const x = 1;');
    simulateReadFile(data);
    const req = makeReq('/player.js');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'relay');

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
    });
  });
});

// ---------------------------------------------------------------------------
// Default 404 fallback
// ---------------------------------------------------------------------------

describe('404 fallback', () => {
  it('GET /unknown → 404', () => {
    const req = makeReq('/unknown');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'unified');

    expect(mockReadFile).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'text/plain' });
    expect(res.end).toHaveBeenCalledWith('Not Found');
  });

  it('GET /admin.html → 404 (direct .html access blocked)', () => {
    const req = makeReq('/admin.html');
    const res = makeRes();

    handleStaticRequest(req, res, PUBLIC_DIR, 'unified');

    // .html does not match .js wildcard and is not a named route
    expect(mockReadFile).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'text/plain' });
  });

  it('req.url undefined defaults gracefully to 404', () => {
    const req = { url: undefined } as http.IncomingMessage;
    const res = makeRes();

    // url defaults to '/' which IS a valid unified route — just verify no crash
    simulateReadFile(Buffer.from(''));
    handleStaticRequest(req, res, PUBLIC_DIR, 'unified');

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'text/html; charset=utf-8' });
  });
});
