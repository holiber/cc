/**
 * Playwright global setup — runs once before any test file.
 *
 * Creates a fresh, isolated data directory for this test run so
 * the server starts with a clean, auto-seeded DB every time.
 *
 * If CC_DATA_DIR is already set (e.g. by scripts/test.mjs), it is reused.
 * Otherwise a new timestamped dir is created under <root>/.cache/.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// playwright/globalSetup.mjs → apps/dashboard → apps → repo root
const ROOT = path.resolve(__dirname, '../../..');

export default async function globalSetup() {
    if (!process.env.CC_DATA_DIR) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dataDir = path.join(ROOT, '.cache', `cc-test-${stamp}`);
        fs.mkdirSync(dataDir, { recursive: true });
        process.env.CC_DATA_DIR = dataDir;
        console.log(`[globalSetup] Fresh test data dir: ${dataDir}`);
    } else {
        // Ensure the dir exists (scripts/test.mjs creates it but good to be safe)
        fs.mkdirSync(process.env.CC_DATA_DIR, { recursive: true });
        console.log(`[globalSetup] Reusing CC_DATA_DIR: ${process.env.CC_DATA_DIR}`);
    }
}
