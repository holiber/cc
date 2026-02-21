import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const cacheDataRoot = path.resolve(repoRoot, '.cache', 'data');
const target = path.resolve(cacheDataRoot, 'dashboard');

function assertSafeTarget(targetPath) {
    const rel = path.relative(cacheDataRoot, targetPath);
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error(`Refusing to delete outside ${cacheDataRoot}: ${targetPath}`);
    }
}

assertSafeTarget(target);

if (!fs.existsSync(target)) {
    // eslint-disable-next-line no-console
    console.log(`[dev:reset-db] Nothing to delete at ${target}`);
    process.exit(0);
}

fs.rmSync(target, { recursive: true, force: true });
// eslint-disable-next-line no-console
console.log(`[dev:reset-db] Deleted ${target}`);

