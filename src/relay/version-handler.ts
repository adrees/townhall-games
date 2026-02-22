import * as http from 'http';

export function handleVersionRequest(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  sha: string,
  startedAt: string,
): void {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ sha, startedAt }));
}
