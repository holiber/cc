#!/usr/bin/env node
/**
 * scripts/show-trace.mjs
 *
 * Opens a Playwright trace. If a path is provided after `--`, uses that.
 * Otherwise, finds the most recently modified `trace.zip` under:
 *   apps/dashboard/test-results/
 *
 * Examples:
 *   pnpm pw:trace
 *   pnpm pw:trace -- apps/dashboard/test-results/.../trace.zip
 */

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DIR = path.join(ROOT, '.cache', 'playwright', 'test-results');

function parseForwardArgs(argv) {
  const idx = argv.indexOf('--');
  return idx === -1 ? [] : argv.slice(idx + 1);
}

async function listTraceZips(dir) {
  const out = [];
  async function walk(current) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    await Promise.all(entries.map(async (ent) => {
      const p = path.join(current, ent.name);
      if (ent.isDirectory()) return walk(p);
      if (ent.isFile() && ent.name === 'trace.zip') {
        const st = await fs.stat(p);
        out.push({ path: p, mtimeMs: st.mtimeMs });
      }
    }));
  }
  await walk(dir);
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

const forwarded = parseForwardArgs(process.argv.slice(2));
const arg0 = forwarded[0];

if (arg0 === '--help' || arg0 === '-h') {
  console.log(`Usage:
  pnpm pw:trace
  pnpm pw:trace -- .cache/playwright/test-results/<run>/trace.zip
`);
  process.exit(0);
}

const tracePath = arg0 ? path.resolve(ROOT, arg0) : null;

let target = tracePath;
if (!target) {
  const traces = await listTraceZips(DEFAULT_DIR);
  if (!traces.length) {
    console.error(`[pw:trace] No trace.zip found under ${DEFAULT_DIR}`);
    console.error('[pw:trace] Run tests with tracing enabled (default: on-first-retry).');
    process.exit(1);
  }
  target = traces[0].path;
} else {
  try {
    await fs.stat(target);
  } catch {
    console.error(`[pw:trace] Trace file does not exist: ${target}`);
    process.exit(1);
  }
}

console.log('[pw:trace] Opening', target);

const child = spawn(
  'pnpm',
  ['-C', path.join(ROOT, 'apps', 'dashboard'), 'exec', 'playwright', 'show-trace', target],
  { cwd: ROOT, stdio: 'inherit', env: { ...process.env } }
);

child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});

