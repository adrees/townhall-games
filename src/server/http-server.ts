import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

export type ServerRole = 'unified' | 'admin' | 'relay';

const ROUTES: Record<string, string> = {
  '/': 'index.html',
  '/admin': 'admin.html',
  '/style.css': 'style.css',
};

const ROLE_ROUTES: Record<ServerRole, Set<string>> = {
  unified: new Set(['/', '/admin', '/style.css']),
  admin: new Set(['/admin', '/style.css']),
  relay: new Set(['/', '/style.css']),
};

export function handleStaticRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  publicDir: string,
  role: ServerRole = 'unified',
): void {
  const url = req.url ?? '/';
  const allowed = ROLE_ROUTES[role];

  // Named routes (HTML pages, CSS) use the explicit allowlist.
  // allowed.has(url) already implies ROUTES[url] exists (both sets are subsets of ROUTES keys).
  if (allowed.has(url)) {
    const fileName = ROUTES[url];
    const filePath = path.join(publicDir, fileName);
    const ext = path.extname(fileName);
    const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
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

  // ES module scripts: serve any .js file directly from publicDir.
  // path.basename prevents directory traversal.
  if (url.endsWith('.js')) {
    const filePath = path.join(publicDir, path.basename(url));
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': CONTENT_TYPES['.js'] });
      res.end(data);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}
