import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

export type ServerRole = 'unified' | 'admin' | 'relay';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
};

interface NamedRoute {
  file: string;
  roles: ServerRole[];
}

// Named routes: URL → { file relative to publicDir, allowed roles }
const NAMED_ROUTES: Record<string, NamedRoute> = {
  '/':          { file: 'index.html', roles: ['unified', 'relay'] },
  '/admin':     { file: 'admin.html', roles: ['unified', 'admin'] },
  '/style.css': { file: 'style.css',  roles: ['unified', 'admin', 'relay'] },
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

  // JS wildcard — all roles allowed; basename-only to prevent traversal
  if (pathname.endsWith('.js')) {
    const filePath = path.join(publicDir, path.basename(pathname));
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
