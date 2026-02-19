#!/usr/bin/env node
/**
 * scripts/e2e.mjs — Playwright runner with dynamic ports.
 *
 * Why: on dev machines, 3222/3223 can be busy due to other projects.
 * This script picks free high ports and exports them via env so both:
 * - Next dev server (apps/dashboard/server.mjs)
 * - terminal WS server (scripts/terminal-server.mjs)
 * start on non-conflicting ports.
 *
 * Usage:
 *   node scripts/e2e.mjs
 *   node scripts/e2e.mjs -- --grep terminal
 */

import net from 'net';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseForwardArgs(argv) {
  const idx = argv.indexOf('--');
  return idx === -1 ? [] : argv.slice(idx + 1);
}

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

function ensureEnv(name, value) {
  if (process.env[name] == null || process.env[name] === '') process.env[name] = String(value);
}

const forwarded = parseForwardArgs(process.argv.slice(2));

function getFlagValue(args, name) {
  const prefix = `${name}=`;
  const idx = args.findIndex((a) => a === name || a.startsWith(prefix));
  if (idx === -1) return null;
  const a = args[idx];
  if (a === name) return args[idx + 1] ?? '';
  return a.slice(prefix.length);
}

function hasFlag(args, name) {
  return args.some((a) => a === name || a.startsWith(`${name}=`));
}

// Allocate ports (unless caller already provided overrides).
if (!process.env.BASE_URL || !process.env.PORT) {
  const nextPort = await getFreePortInRange();
  ensureEnv('PORT', nextPort);
  ensureEnv('BASE_URL', `http://127.0.0.1:${nextPort}`);
}

if (!process.env.NEXT_PUBLIC_TERMINAL_WS_PORT || !process.env.TERMINAL_WS_URL) {
  const terminalPort = await getFreePortInRange();
  ensureEnv('NEXT_PUBLIC_TERMINAL_WS_PORT', terminalPort);
  ensureEnv('TERMINAL_WS_URL', `ws://127.0.0.1:${terminalPort}`);
}

// Isolate Next.js build output to avoid `.next/dev/lock` conflicts.
// Make it relative to apps/dashboard/ working dir, pointing into repo root `.cache/`.
// This prevents apps/dashboard/ from accumulating `.next-e2e-*` folders.
ensureEnv('NEXT_DIST_DIR', `../../.cache/next-e2e-${process.env.PORT}`);

// Force a fresh server by default for determinism; allow opt-out.
ensureEnv('CC_FRESH_SERVER', '1');

// If we're launching UI mode, pin the UI port to a free port and print it so it's easy to open manually
// in a different browser if the auto-opened one renders a blank page.
if (hasFlag(forwarded, '--ui') && !hasFlag(forwarded, '--ui-port')) {
  const uiPort = await getFreePortInRange();
  forwarded.push(`--ui-port=${uiPort}`);
}
if (hasFlag(forwarded, '--ui') && !hasFlag(forwarded, '--ui-host')) {
  forwarded.push('--ui-host=127.0.0.1');
}

console.log('[e2e] BASE_URL:', process.env.BASE_URL);
console.log('[e2e] PORT:', process.env.PORT);
console.log('[e2e] NEXT_PUBLIC_TERMINAL_WS_PORT:', process.env.NEXT_PUBLIC_TERMINAL_WS_PORT);
console.log('[e2e] TERMINAL_WS_URL:', process.env.TERMINAL_WS_URL);
if (hasFlag(forwarded, '--ui')) {
  const uiHost = getFlagValue(forwarded, '--ui-host') || '127.0.0.1';
  const uiPort = getFlagValue(forwarded, '--ui-port');
  if (uiPort) console.log('[e2e] UI:', `http://${uiHost}:${uiPort}`);
}

// Run Playwright from the dashboard package (no recursion through package scripts).
const pnpmArgs = [
  '-C',
  path.join(ROOT, 'apps/dashboard'),
  'exec',
  'playwright',
  'test',
  ...forwarded,
];

const child = spawn('pnpm', pnpmArgs, {
  cwd: ROOT,
  env: { ...process.env },
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});

