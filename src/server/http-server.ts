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
  const fileName = allowed.has(url) ? ROUTES[url] : undefined;

  if (!fileName) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

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
}
