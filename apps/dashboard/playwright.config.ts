import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const CACHE_ROOT = path.join(ROOT, '.cache');
const PW_CACHE = path.join(CACHE_ROOT, 'playwright');

const AUTH_FILE = path.join(PW_CACHE, 'auth', 'user.json');
const baseURL = process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || '3222'}`;
const isCI = !!process.env.CI;
const isLocal = (() => {
    try {
        const host = new URL(baseURL).hostname;
        return host === 'localhost' || host === '127.0.0.1';
    } catch {
        return baseURL.includes('localhost') || baseURL.includes('127.0.0.1');
    }
})();

const terminalPort = parseInt(process.env.NEXT_PUBLIC_TERMINAL_WS_PORT || '3223', 10);
const reuseExistingServer = process.env.CC_REUSE_SERVERS === '1' && !process.env.CC_FRESH_SERVER;

export default defineConfig({
    testDir: './tests',
    outputDir: path.join(PW_CACHE, 'test-results'),
    fullyParallel: isCI ? false : true,
    forbidOnly: isCI,
    retries: isCI ? 2 : 0,
    // In CI, avoid parallel workers to reduce flakiness and any chance of port/process conflicts.
    workers: isCI ? 1 : (isLocal ? undefined : 1),
    reporter: [['html', { outputFolder: path.join(PW_CACHE, 'report'), open: 'never' }]],

    /**
     * globalSetup creates a fresh CC_DATA_DIR (.cache/cc-test-<ts>/) before
     * any test runs or the webServer is launched.
     */
    globalSetup: './playwright/globalSetup.mjs',

    use: {
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        // Auth setup — runs first, stores cookies
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
        },
        // All tests — depend on setup, reuse auth state
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: AUTH_FILE,
            },
            dependencies: ['setup'],
        },
    ],
    ...(isLocal ? {
        webServer: [
            {
                /**
                 * CC_DATA_DIR is set by globalSetup (already in process.env by the
                 * time playwright spawns the webServer child process via env inheritance).
                 */
                command: 'pnpm dev',
                url: baseURL,
                reuseExistingServer,
                timeout: 60_000,
                stdout: 'pipe',
                stderr: 'pipe',
                env: {
                    // Explicitly forward so the child inherits the fresh dir
                    ...(process.env.CC_DATA_DIR ? { CC_DATA_DIR: process.env.CC_DATA_DIR } : {}),
                    ...(process.env.PORT ? { PORT: process.env.PORT } : {}),
                    ...(process.env.NEXT_PUBLIC_TERMINAL_WS_PORT ? { NEXT_PUBLIC_TERMINAL_WS_PORT: process.env.NEXT_PUBLIC_TERMINAL_WS_PORT } : {}),
                    ...(process.env.NEXT_DIST_DIR ? { NEXT_DIST_DIR: process.env.NEXT_DIST_DIR } : {}),
                },
            },
            {
                /**
                 * Terminal WebSocket server — required by terminal-echo and terminal-zombie tests.
                 * Runs on NEXT_PUBLIC_TERMINAL_WS_PORT (default :3223).
                 */
                command: `node ${path.join(ROOT, 'scripts/terminal-server.mjs')}`,
                port: terminalPort,
                reuseExistingServer,
                timeout: 15_000,
                stdout: 'pipe',
                stderr: 'pipe',
                env: {
                    ...(process.env.NEXT_PUBLIC_TERMINAL_WS_PORT ? { NEXT_PUBLIC_TERMINAL_WS_PORT: process.env.NEXT_PUBLIC_TERMINAL_WS_PORT } : {}),
                },
            },
        ],
    } : {}),
});
