#!/usr/bin/env node
/**
 * Guardrail: disallow explicit sleeps/waits longer than 3 minutes in tests.
 *
 * Why: long `waitForTimeout(...)` / `sleep(...)` delays make the suite slow and flaky.
 * This check runs before tests and fails fast if someone introduces a long sleep.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const MAX_MS = 180_000;
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['node_modules', '.git', '.cache', '.next', 'dist', 'build', 'coverage']);

function toNumberLiteral(raw) {
    return Number(String(raw).replace(/_/g, ''));
}

function getLineNumber(text, index) {
    // 1-based line number
    return text.slice(0, index).split('\n').length;
}

function walk(dir, out = []) {
    let entries = [];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return out;
    }
    for (const ent of entries) {
        if (ent.isDirectory()) {
            if (SKIP_DIRS.has(ent.name)) continue;
            walk(path.join(dir, ent.name), out);
            continue;
        }
        if (!ent.isFile()) continue;
        const ext = path.extname(ent.name);
        if (!EXTENSIONS.has(ext)) continue;
        out.push(path.join(dir, ent.name));
    }
    return out;
}

export function assertNoLongSleeps({
    root = ROOT,
    maxMs = MAX_MS,
    // Restrict to test code + runners to avoid false positives in app UI code.
    targetDirs = [
        path.join(ROOT, 'apps/dashboard/tests'),
        path.join(ROOT, 'packages'),
        path.join(ROOT, 'scripts'),
    ],
} = {}) {
    const files = [];
    for (const d of targetDirs) {
        // Only scan `packages/**/tests` instead of the full packages tree.
        if (d.endsWith(path.sep + 'packages')) {
            const pkgs = walk(d).filter((f) => f.includes(`${path.sep}tests${path.sep}`));
            files.push(...pkgs);
        } else {
            files.push(...walk(d));
        }
    }

    const patterns = [
        { name: 'page.waitForTimeout', re: /\bwaitForTimeout\s*\(\s*([0-9][0-9_]*)\s*\)/g },
        { name: 'sleep', re: /\bsleep\s*\(\s*([0-9][0-9_]*)\s*\)/g },
        { name: 'setTimeout', re: /\bsetTimeout\s*\(\s*[^,]*,\s*([0-9][0-9_]*)\s*\)/g },
        { name: 'setInterval', re: /\bsetInterval\s*\(\s*[^,]*,\s*([0-9][0-9_]*)\s*\)/g },
    ];

    const violations = [];
    for (const file of files) {
        let text = '';
        try {
            text = fs.readFileSync(file, 'utf8');
        } catch {
            continue;
        }
        for (const { name, re } of patterns) {
            re.lastIndex = 0;
            let m;
            while ((m = re.exec(text)) !== null) {
                const ms = toNumberLiteral(m[1]);
                if (!Number.isFinite(ms)) continue;
                if (ms <= maxMs) continue;
                violations.push({
                    file,
                    line: getLineNumber(text, m.index),
                    name,
                    ms,
                    excerpt: text.slice(m.index, Math.min(text.length, m.index + 160)).split('\n')[0],
                });
            }
        }
    }

    if (violations.length > 0) {
        // eslint-disable-next-line no-console
        console.error(`\n✖ Long sleeps are not allowed (>${maxMs}ms). Found:\n`);
        for (const v of violations) {
            // eslint-disable-next-line no-console
            console.error(`- ${path.relative(root, v.file)}:${v.line} ${v.name}(${v.ms})`);
            // eslint-disable-next-line no-console
            console.error(`  ${v.excerpt.trim()}\n`);
        }
        process.exit(1);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
    assertNoLongSleeps();
}

