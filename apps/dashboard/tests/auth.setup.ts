/**
 * Playwright auth setup — runs before all test suites.
 * Logs in via Payload's REST API and saves the authenticated
 * browser state (cookies) so all tests reuse it.
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ROOT = path.resolve(__dirname, '../../..');
const AUTH_FILE = path.join(ROOT, '.cache', 'playwright', 'auth', 'user.json');

const E2E_EMAIL = 'test@cc.local';
const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD || 'barducks';

setup('authenticate', async ({ request, baseURL }) => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Login via REST API to get the token (retry on transient SQLite locking)
    let loginResponse: any | null = null;
    for (let attempt = 1; attempt <= 25; attempt++) {
        loginResponse = await request.post('/api/users/login', {
            data: { email: E2E_EMAIL, password: E2E_PASSWORD },
        });
        if (loginResponse.ok()) break;

        const status = loginResponse.status();
        // Payload/SQLite can transiently fail with 500 when the DB is locked during startup/seed.
        if (status === 500 || status === 503) {
            await sleep(Math.min(1000, 100 + attempt * 50));
            continue;
        }
        break;
    }

    expect(loginResponse?.ok(), 'Login API should return 200').toBeTruthy();

    const { token } = await loginResponse!.json();
    expect(token, 'Login response should contain a token').toBeTruthy();

    // Ensure the auth dir exists
    const authDir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    // Build a storageState with the payload-token cookie
    const origin = baseURL || 'http://localhost:3222';
    const storageState = {
        cookies: [
            {
                name: 'payload-token',
                value: token,
                domain: new URL(origin).hostname,
                path: '/',
                httpOnly: true,
                secure: origin.startsWith('https'),
                sameSite: 'Lax' as const,
                expires: -1, // session cookie
            },
        ],
        origins: [],
    };

    fs.writeFileSync(AUTH_FILE, JSON.stringify(storageState, null, 2));
});
