import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

export type ServerRole = 'unified' | 'admin' | 'relay';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.csv':  'text/csv; charset=utf-8',
};

interface NamedRoute {
  file: string;
  roles: ServerRole[];
}

// Named routes: URL → { file relative to publicDir, allowed roles }
const NAMED_ROUTES: Record<string, NamedRoute> = {
  '/admin':             { file: 'admin/index.html',    roles: ['unified', 'admin'] },
  '/admin/bingo':       { file: 'admin/bingo.html',    roles: ['unified', 'admin'] },
  '/admin/trivia':      { file: 'admin/trivia.html',   roles: ['unified', 'admin'] },
  '/play':              { file: 'play/index.html',     roles: ['unified', 'relay'] },
  '/broadcast/trivia':  { file: 'broadcast/trivia.html', roles: ['unified', 'relay'] },
  '/style.css':         { file: 'style.css',           roles: ['unified', 'admin', 'relay'] },
};

export function handleStaticRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  publicDir: string,
  role: ServerRole = 'unified',
): void {
  const rawUrl = req.url ?? '/';
  const pathname = rawUrl.split('?')[0] || '/';

  // Named HTML/CSS routes with role-based access control
  const route = NAMED_ROUTES[pathname];
  if (route) {
    if (!route.roles.includes(role)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const filePath = path.join(publicDir, route.file);
    const ext = path.extname(route.file);
    const contentType = CONTENT_TYPES[ext] ?? 'text/plain';
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
    return;
  }

  // CSV wildcard — fixture files; path must resolve within publicDir
  if (pathname.endsWith('.csv')) {
    const resolvedPublic = path.resolve(publicDir);
    const filePath = path.resolve(path.join(publicDir, pathname));
    if (!filePath.startsWith(resolvedPublic + path.sep) && filePath !== resolvedPublic) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // JS wildcard — all roles allowed; path must resolve within publicDir
  if (pathname.endsWith('.js')) {
    const resolvedPublic = path.resolve(publicDir);
    const filePath = path.resolve(path.join(publicDir, pathname));
    if (!filePath.startsWith(resolvedPublic + path.sep) && filePath !== resolvedPublic) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // Everything else → 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}
