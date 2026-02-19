#!/usr/bin/env node
/**
 * scripts/test.mjs — unified test runner
 *
 * Usage:
 *   pnpm test                   # from repo root — runs vitest + playwright
 *   CC_DATA_DIR=.cache/my-dir pnpm test   # use a specific data dir
 *
 * What it does:
 *   1. Creates a fresh isolated data dir in .cache/cc-test-<timestamp>/
 *      (or reuses CC_DATA_DIR if already set)
 *   2. Runs Vitest (packages/client) — in-process, no server needed
 *   3. Starts the terminal WS server (scripts/terminal-server.mjs) on :3223
 *   4. Runs Playwright (apps/dashboard) — starts a fresh Next.js server via webServer
 *   5. Stops the terminal server
 *   6. Exits with combined status (non-zero if either suite fails)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── 1. Prepare data dir ─────────────────────────────────────

const dataDir = process.env.CC_DATA_DIR
    ? path.resolve(process.env.CC_DATA_DIR)
    : path.join(ROOT, '.cache', `cc-test-${new Date().toISOString().replace(/[:.]/g, '-')}`);

fs.mkdirSync(dataDir, { recursive: true });
process.env.CC_DATA_DIR = dataDir;

console.log(`\n╔══════════════════════════════════════════════╗`);
console.log(`║  CommandCenter Test Suite                    ║`);
console.log(`╚══════════════════════════════════════════════╝`);
console.log(`  Data dir: ${dataDir}\n`);

// ── 2. Helper to run a command, capture exit code ────────────

function run(label, command, cwd = ROOT) {
    console.log(`\n▶ ${label}`);
    console.log(`  ${command}\n`);
    try {
        execSync(command, {
            cwd,
            stdio: 'inherit',
            env: { ...process.env },
        });
        return 0;
    } catch (err) {
        return err.status ?? 1;
    }
}

// ── 3. Pick dynamic ports to avoid collisions ────────────────

async function getFreePortInRange(min = 49152, max = 65535) {
    for (let i = 0; i < 200; i++) {
        const candidate = Math.floor(Math.random() * (max - min + 1)) + min;
        // eslint-disable-next-line no-await-in-loop
        const ok = await new Promise((resolve) => {
            const srv = net.createServer();
            srv.unref();
            srv.once('error', () => resolve(false));
            srv.listen(candidate, '127.0.0.1', () => srv.close(() => resolve(true)));
        });
        if (ok) return candidate;
    }
    throw new Error('Unable to find a free TCP port in the dynamic range');
}

if (!process.env.PORT || !process.env.BASE_URL) {
    const nextPort = await getFreePortInRange();
    process.env.PORT = String(nextPort);
    process.env.BASE_URL = `http://127.0.0.1:${nextPort}`;
}

if (!process.env.NEXT_PUBLIC_TERMINAL_WS_PORT || !process.env.TERMINAL_WS_URL) {
    const terminalPort = await getFreePortInRange();
    process.env.NEXT_PUBLIC_TERMINAL_WS_PORT = String(terminalPort);
    process.env.TERMINAL_WS_URL = `ws://127.0.0.1:${terminalPort}`;
}

// ── 4. Run suites ────────────────────────────────────────────

let exitCode = 0;

// Vitest — in-process, fast, no server required
const vitestExit = run(
    'Unit & Integration Tests (Vitest)',
    'pnpm -F @command-center/client test',
);
if (vitestExit !== 0) exitCode = vitestExit;

// Playwright — starts a fresh Next.js server via webServer config
// CC_FRESH_SERVER=1 disables reuseExistingServer
const playwrightExit = run(
    'E2E Tests (Playwright)',
    'CC_FRESH_SERVER=1 pnpm -F @command-center/dashboard test',
);
if (playwrightExit !== 0) exitCode = playwrightExit;

// ── 5. Summary ───────────────────────────────────────────────

console.log('\n──────────────────────────────────────────────');
console.log(vitestExit === 0 ? '  ✅ Vitest:     passed' : '  ❌ Vitest:     FAILED');
console.log(playwrightExit === 0 ? '  ✅ Playwright: passed' : '  ❌ Playwright: FAILED');
console.log(`\n  Data dir: ${dataDir}`);
console.log('──────────────────────────────────────────────\n');

process.exit(exitCode);
