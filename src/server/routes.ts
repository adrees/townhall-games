import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
};

// Named routes: URL path → file relative to publicDir
const ROUTE_MAP: Record<string, string> = {
  '/admin':            'admin/index.html',
  '/admin/bingo':      'admin/bingo.html',
  '/admin/trivia':     'admin/trivia.html',
  '/play':             'play/index.html',
  '/broadcast/trivia': 'broadcast/trivia.html',
};

export function isDemoMode(rawUrl: string): boolean {
  const parsed = url.parse(rawUrl, true);
  return parsed.query['demo'] === 'true';
}

export function handleStaticRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  publicDir: string,
): void {
  const rawUrl = req.url ?? '/';
  // Strip query string for path matching
  const pathname = url.parse(rawUrl).pathname ?? '/';

  // Named HTML routes
  const namedFile = ROUTE_MAP[pathname];
  if (namedFile) {
    serveFile(res, path.join(publicDir, namedFile));
    return;
  }

  // Static asset fallback — resolve against publicDir with traversal guard
  const resolved = path.resolve(publicDir, pathname.replace(/^\//, ''));
  if (!resolved.startsWith(path.resolve(publicDir))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  serveFile(res, resolved);
}

function serveFile(res: http.ServerResponse, filePath: string): void {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}
