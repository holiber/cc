#!/usr/bin/env node
/**
 * scripts/smoke.mjs — Run scenario tests with SMOKE rules.
 *
 * SMOKE rules:
 *   - Stop on first failure (--max-failures=1)
 *   - Strict time limits (configurable via env vars)
 *   - Minimal terminal output: one line on success, short line + artifacts path on failure
 *   - Full test output goes to .cache/tests/test-smoke__scenario/run.log
 *
 * Env vars (contract):
 *   SMOKE_PER_TEST_TIMEOUT_MS  (default 30000)
 *   SMOKE_TOTAL_TIMEOUT_MS     (default 180000)
 *   SMOKE_WARN_AFTER_MS        (default 60000)
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTIFACTS = path.join(ROOT, '.cache', 'tests', 'test-smoke__scenario');

const PER_TEST_TIMEOUT = parseInt(process.env.SMOKE_PER_TEST_TIMEOUT_MS || '30000', 10);
const TOTAL_TIMEOUT = parseInt(process.env.SMOKE_TOTAL_TIMEOUT_MS || '180000', 10);
const WARN_AFTER = parseInt(process.env.SMOKE_WARN_AFTER_MS || '60000', 10);

fs.rmSync(ARTIFACTS, { recursive: true, force: true });
fs.mkdirSync(ARTIFACTS, { recursive: true });

const start = Date.now();
const logPath = path.join(ARTIFACTS, 'run.log');
const logStream = fs.createWriteStream(logPath);

const dataDir = path.join(ARTIFACTS, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const child = spawn('node', [
    'scripts/e2e.mjs',
    '--',
    'tests/all-pages.spec.ts',
    '--max-failures=1',
    '--reporter=list',
    `--timeout=${PER_TEST_TIMEOUT}`,
], {
    cwd: ROOT,
    env: { ...process.env, CC_DATA_DIR: dataDir },
    stdio: ['inherit', 'pipe', 'pipe'],
});

let output = '';

child.stdout.on('data', (chunk) => {
    output += chunk;
    logStream.write(chunk);
});

child.stderr.on('data', (chunk) => {
    output += chunk;
    logStream.write(chunk);
});

const totalTimer = setTimeout(() => {
    child.kill('SIGTERM');
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`SMOKE FAIL: total timeout exceeded (${elapsed}s > ${TOTAL_TIMEOUT / 1000}s)`);
    console.log(`  Artifacts: ${ARTIFACTS}`);
    process.exit(1);
}, TOTAL_TIMEOUT);

const warnTimer = setTimeout(() => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    process.stderr.write(`SMOKE WARNING: ${elapsed}s elapsed (warn threshold: ${WARN_AFTER / 1000}s)\n`);
}, WARN_AFTER);

child.on('exit', (code) => {
    clearTimeout(totalTimer);
    clearTimeout(warnTimer);
    logStream.end();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);
    const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
    const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
    const total = passed + failed;

    if (code === 0) {
        const counts = total > 0 ? `${passed}/${total} passed` : 'passed';
        console.log(`SMOKE: ${counts} in ${elapsed}s`);
        process.exit(0);
    }

    const failLine = output.match(/[-✘×]\s+.*?›\s+(.+?)(?:\s+\(|$)/m);
    const testName = failLine ? failLine[1].trim() : 'scenario';
    const reason = failed > 0 ? `${failed} failed` : `exit code ${code}`;
    console.log(`SMOKE FAIL: ${testName} (${reason})`);
    console.log(`  Artifacts: ${ARTIFACTS}`);
    process.exit(1);
});
