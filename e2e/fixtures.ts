import { test as base } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const addr = srv.address() as net.AddressInfo;
      srv.close(() => resolve(addr.port));
    });
    srv.on('error', reject);
  });
}

async function waitForPort(port: number, timeout = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    await new Promise((r) => setTimeout(r, 100));
    const ok = await new Promise<boolean>((resolve) => {
      const sock = net.createConnection({ port }, () => { sock.destroy(); resolve(true); });
      sock.on('error', () => resolve(false));
    });
    if (ok) return;
  }
  throw new Error(`Server did not start on port ${port} within ${timeout}ms`);
}

type ServerFixture = { serverUrl: string };

export const test = base.extend<ServerFixture>({
  serverUrl: async ({}, use) => {
    const port = await getFreePort();
    const proc: ChildProcess = spawn('node', ['dist/server/index.js'], {
      cwd: '/home/adamgrees/work_area/townhall-games',
      env: { ...process.env, PORT: String(port) },
      stdio: 'ignore',
    });
    await waitForPort(port);
    await use(`http://localhost:${port}`);
    proc.kill();
  },
});

export { expect } from '@playwright/test';
