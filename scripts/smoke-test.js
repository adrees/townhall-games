'use strict';

const https = require('https');
const http = require('http');
const { WebSocket } = require('ws');

// ---------------------------------------------------------------------------
// Config from environment
// ---------------------------------------------------------------------------

const SMOKE_URL = process.env.SMOKE_URL;
const EXPECTED_SHA = process.env.EXPECTED_SHA;
const RELAY_SECRET = process.env.RELAY_SECRET;

if (!SMOKE_URL) {
  console.error('ERROR: SMOKE_URL environment variable is required');
  process.exit(1);
}

const parsedUrl = new URL(SMOKE_URL);
const isHttps = parsedUrl.protocol === 'https:';
const WS_BASE = `${isHttps ? 'wss' : 'ws'}://${parsedUrl.host}`;

const POLL_INTERVAL_MS = 30_000;
const VERSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const WS_TIMEOUT_MS = 10_000; // 10 seconds

const ASSETS = [
  { path: '/', contentType: 'text/html' },
  { path: '/style.css', contentType: 'text/css' },
  { path: '/player.js', contentType: 'application/javascript' },
  { path: '/ws-client.js', contentType: 'application/javascript' },
  { path: '/handlers.js', contentType: 'application/javascript' },
  { path: '/ui.js', contentType: 'application/javascript' },
  { path: '/state.js', contentType: 'application/javascript' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let failed = false;

function fail(msg) {
  console.error(`  FAIL: ${msg}`);
  failed = true;
}

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function warn(msg) {
  console.warn(`  ⚠  ${msg}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const mod = isHttps ? https : http;
    const req = mod.get(`${SMOKE_URL}${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(10_000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

// ---------------------------------------------------------------------------
// Step 1: Wait for the correct version to be deployed
// ---------------------------------------------------------------------------

async function waitForVersion() {
  if (!EXPECTED_SHA) {
    console.log('No EXPECTED_SHA provided — waiting for server to be reachable...');
    const start = Date.now();
    while (Date.now() - start < VERSION_TIMEOUT_MS) {
      try {
        await httpGet('/version');
        pass('Server is reachable');
        return;
      } catch {
        console.log('  Server not reachable yet — retrying in 30s');
        await sleep(POLL_INTERVAL_MS);
      }
    }
    fail('Server did not become reachable within 10 minutes');
    return;
  }

  console.log(`Waiting for SHA ${EXPECTED_SHA.slice(0, 8)} to be deployed (up to 10 min)...`);
  const start = Date.now();

  while (true) {
    if (Date.now() - start >= VERSION_TIMEOUT_MS) {
      fail(`Timeout: SHA ${EXPECTED_SHA.slice(0, 8)} not deployed after 10 minutes`);
      return;
    }

    try {
      const res = await httpGet('/version');
      if (res.status === 200) {
        const data = JSON.parse(res.body);
        if (data.sha === EXPECTED_SHA) {
          pass(`Correct version deployed (${data.sha.slice(0, 8)})`);
          return;
        }
        const deployed = String(data.sha).slice(0, 8);
        console.log(`  Deployed: ${deployed}, expected: ${EXPECTED_SHA.slice(0, 8)} — retrying in 30s`);
      } else {
        console.log(`  /version returned HTTP ${res.status} — retrying in 30s`);
      }
    } catch {
      console.log('  Server not reachable yet — retrying in 30s');
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

// ---------------------------------------------------------------------------
// Step 2: Check static assets
// ---------------------------------------------------------------------------

async function checkStaticAssets() {
  console.log('\nChecking static assets...');
  for (const { path, contentType } of ASSETS) {
    try {
      const res = await httpGet(path);
      if (res.status !== 200) {
        fail(`GET ${path} → HTTP ${res.status} (expected 200)`);
        continue;
      }
      const ct = String(res.headers['content-type'] ?? '');
      if (!ct.startsWith(contentType)) {
        fail(`GET ${path} → Content-Type: "${ct}" (expected "${contentType}")`);
        continue;
      }
      pass(`GET ${path} → 200 ${contentType}`);
    } catch (e) {
      fail(`GET ${path} → ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Step 3: Player WebSocket connectivity
// ---------------------------------------------------------------------------

async function checkPlayerWebSocket() {
  console.log('\nChecking player WebSocket...');
  try {
    const msg = await wsReceiveOne('/');
    pass(`Player WS connected, received: ${JSON.stringify(msg)}`);
  } catch (e) {
    fail(`Player WS failed: ${e.message}`);
  }
}

function wsReceiveOne(path) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_BASE}${path}`);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`No message received within ${WS_TIMEOUT_MS / 1000}s`));
    }, WS_TIMEOUT_MS);

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    ws.on('message', (data) => {
      clearTimeout(timer);
      ws.close();
      try {
        resolve(JSON.parse(data.toString()));
      } catch {
        resolve(data.toString());
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Step 4: Admin WebSocket registration
// ---------------------------------------------------------------------------

async function checkAdminWebSocket() {
  if (!RELAY_SECRET) {
    warn('RELAY_SECRET not set — skipping admin WebSocket check');
    return;
  }

  console.log('\nChecking admin WebSocket...');
  await new Promise((resolve) => {
    const ws = new WebSocket(`${WS_BASE}/admin`);

    const timer = setTimeout(() => {
      ws.terminate();
      fail('Admin WS: no response to admin_register within 10s');
      resolve();
    }, WS_TIMEOUT_MS);

    ws.on('error', (err) => {
      clearTimeout(timer);
      fail(`Admin WS connection failed: ${err.message}`);
      resolve();
    });

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          envelope: 'admin_register',
          sessionId: 'smoke-test',
          secret: RELAY_SECRET,
        }),
      );
    });

    ws.on('message', (data) => {
      clearTimeout(timer);
      ws.close();
      try {
        const msg = JSON.parse(data.toString());
        if (msg.envelope === 'admin_registered') {
          pass('Admin WS registered successfully');
        } else if (msg.envelope === 'admin_error' && msg.message === 'Admin already connected') {
          warn('Admin already connected to relay — non-fatal, skipping admin WS check');
        } else {
          fail(`Admin WS unexpected response: ${JSON.stringify(msg)}`);
        }
      } catch {
        fail(`Admin WS non-JSON response: ${data.toString()}`);
      }
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Smoke test target: ${SMOKE_URL}`);
  console.log('='.repeat(50));

  await waitForVersion();
  if (failed) {
    console.error('\nSmoke test FAILED (version check)');
    process.exit(1);
  }

  await checkStaticAssets();
  await checkPlayerWebSocket();
  await checkAdminWebSocket();

  console.log('\n' + '='.repeat(50));
  if (failed) {
    console.error('Smoke test FAILED');
    process.exit(1);
  }
  console.log('Smoke test PASSED');
  process.exit(0);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
