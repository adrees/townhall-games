import * as http from 'http';
import { handleStaticRequest as routeRequest } from './routes';

export type ServerRole = 'unified' | 'admin' | 'relay';

export function handleStaticRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  publicDir: string,
  _role: ServerRole = 'unified',
): void {
  routeRequest(req, res, publicDir);
}
