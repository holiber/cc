import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.resolve(__dirname, '..', '.cache');

const WARN_BYTES = 1024 ** 3; // 1 GB

function dirSize(dir) {
    let total = 0;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return 0; }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            total += dirSize(full);
        } else {
            try { total += fs.statSync(full).size; } catch { /* skip */ }
        }
        if (total > WARN_BYTES) return total; // early exit once threshold exceeded
    }
    return total;
}

if (fs.existsSync(cacheDir)) {
    const bytes = dirSize(cacheDir);
    if (bytes > WARN_BYTES) {
        const gb = (bytes / 1024 ** 3).toFixed(2);
        console.warn(`\n⚠️  .cache is ${gb} GB (>${(WARN_BYTES / 1024 ** 3).toFixed(0)} GB). Consider running: pnpm dev:reset-db  or  rm -rf .cache\n`);
    }
}
