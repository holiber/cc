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
 *
 * Uses Playwright JSON reporter for robust result parsing (no regex on terminal output).
 */

import { spawn } from 'child_process';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTIFACTS = path.join(ROOT, '.cache', 'tests', 'test-smoke__scenario');
const JSON_REPORT = path.join(ARTIFACTS, 'playwright-report.json');

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
    '--quiet',
], {
    cwd: ROOT,
    env: {
        ...process.env,
        CC_DATA_DIR: dataDir,
        CC_SMOKE: '1',
        TEST_ARTIFACTS_DIR: ARTIFACTS,
        PW_JSON_OUTPUT_FILE: JSON_REPORT,
    },
    stdio: ['inherit', 'pipe', 'pipe'],
});

child.stdout.on('data', (chunk) => logStream.write(chunk));
child.stderr.on('data', (chunk) => logStream.write(chunk));

// ── Total timeout with SIGTERM → SIGKILL escalation ──────────

let timedOut = false;
const totalTimer = setTimeout(() => {
    timedOut = true;
    try { child.kill('SIGTERM'); } catch { /* ignore */ }
    setTimeout(() => {
        try { child.kill('SIGKILL'); } catch { /* ignore */ }
    }, 1500).unref?.();
}, TOTAL_TIMEOUT);
totalTimer.unref?.();

// ── Track slow warning (folded into success suffix) ──────────

let exceededWarn = false;
const warnTimer = setTimeout(() => { exceededWarn = true; }, WARN_AFTER);
warnTimer.unref?.();

// ── JSON report parsing helpers (ported from jabterm) ────────

function collectTestsFromSuites(suites, out) {
    for (const s of suites || []) {
        for (const spec of s.specs || []) {
            for (const t of spec.tests || []) {
                out.push({ ...t, title: spec.title });
            }
        }
        if (s.suites) collectTestsFromSuites(s.suites, out);
    }
}

function getFinalStatus(test) {
    const results = test?.results || [];
    for (const r of results) {
        if (r.status === 'failed' || r.status === 'timedOut') return 'failed';
    }
    for (const r of results) {
        if (r.status === 'passed') return 'passed';
    }
    return 'unknown';
}

function truncateOneLine(s, max = 160) {
    const one = String(s || '').replace(/\s+/g, ' ').trim();
    if (one.length <= max) return one;
    return `${one.slice(0, max - 1)}…`;
}

// ── Handle exit ──────────────────────────────────────────────

child.on('exit', async (code) => {
    clearTimeout(totalTimer);
    clearTimeout(warnTimer);
    logStream.end();

    const elapsedS = ((Date.now() - start) / 1000).toFixed(1);

    if (timedOut) {
        console.log(`SMOKE FAIL: scenario (timeout after ${elapsedS}s)`);
        console.log(`  Artifacts: ${ARTIFACTS}`);
        process.exit(1);
    }

    // Parse JSON report for pass/fail counts
    let passed = 0;
    let total = 0;
    let tests = [];
    try {
        const raw = await fsp.readFile(JSON_REPORT, 'utf8');
        const report = JSON.parse(raw);
        collectTestsFromSuites(report?.suites, tests);
        total = tests.length;
        for (const t of tests) {
            if (getFinalStatus(t) === 'passed') passed++;
        }
    } catch {
        // best-effort; keep smoke output stable even if JSON isn't available
    }

    if (code === 0) {
        const ratio = total > 0 ? `${passed}/${total}` : 'all';
        const warnSuffix = exceededWarn ? ' (warn: exceeded SMOKE_WARN_AFTER_MS)' : '';
        console.log(`SMOKE: ${ratio} passed in ${elapsedS}s${warnSuffix}`);
        process.exit(0);
    }

    // Failure — extract first failing test info from JSON
    let failName = 'scenario';
    let reason = `exit ${code ?? '?'}`;
    try {
        const firstFail = tests.find((t) => getFinalStatus(t) === 'failed');
        if (firstFail) {
            failName = firstFail.title ? String(firstFail.title) : failName;
            const lastResult = (firstFail.results || []).at(-1);
            const err = lastResult?.error?.message || lastResult?.error?.value;
            if (err) reason = truncateOneLine(err);
        }
    } catch { /* ignore */ }

    console.log(`SMOKE FAIL: ${truncateOneLine(failName, 80)} (${reason})`);
    console.log(`  Artifacts: ${ARTIFACTS}`);
    process.exit(code || 1);
});
