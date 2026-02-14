import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

const ROUTES: Record<string, string> = {
  '/': 'index.html',
  '/admin': 'admin.html',
  '/style.css': 'style.css',
};

export function handleStaticRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  publicDir: string,
): void {
  const url = req.url ?? '/';
  const fileName = ROUTES[url];

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
