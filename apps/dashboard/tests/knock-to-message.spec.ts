import { test, expect } from '@playwright/test';

async function loginAsTestAdmin(page: any, request: any, baseURL: string) {
    const loginRes = await request.post('/api/users/login', {
        data: { email: 'test@cc.local', password: process.env.E2E_TEST_PASSWORD || 'barducks' },
    });
    expect(loginRes.ok(), 'test@cc.local login should succeed').toBeTruthy();
    const json: any = await loginRes.json();
    const token = json?.token;
    expect(token, 'login should return token').toBeTruthy();

    const origin = baseURL || 'http://127.0.0.1:3222';
    const u = new URL(origin);
    await page.context().addCookies([{
        name: 'payload-token',
        value: String(token),
        domain: u.hostname,
        path: '/',
        httpOnly: true,
        secure: u.protocol === 'https:',
        sameSite: 'Lax',
        expires: -1,
    }]);
}

test('knock creates an admin-visible message', async ({ page, request, baseURL }) => {
    test.setTimeout(180_000);

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const name = `Stranger-${suffix}`;
    const ip = `10.0.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;

    // Ensure the admin session is active for subsequent UI refresh.
    await loginAsTestAdmin(page, request, baseURL || '');
    await page.goto('/messages', { waitUntil: 'domcontentloaded' });

    const res = await page.request.post('/api/v1/knock', {
        headers: {
            'x-forwarded-for': ip,
        },
        data: {
            name,
            role: 'agent',
            intent: 'Hello from E2E',
            descriptor: {
                machine: 'playwright',
                ip,
                runtime: 'node',
                via: 'playwright',
            },
            secret: 'e2e-secret-phrase',
        },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const requestId = body?.requestId as string | undefined;
    expect(requestId).toBeTruthy();

    // E2E disables polling; force a single refresh so the new message appears.
    await page.reload({ waitUntil: 'domcontentloaded' });

    const expectedSubject = `Knock request from ${name}`;
    const listItem = page.locator('button', { hasText: expectedSubject }).first();
    // The app is compiled lazily; allow extra time in CI / cold compiles.
    await expect(listItem).toBeVisible({ timeout: 120_000 });
    await listItem.click();

    await expect(page.getByRole('heading', { name: expectedSubject })).toBeVisible({ timeout: 30_000 });

    // Cleanup: do not leave pending knocks around (they would inflate admin notifications in later tests).
    await page.request.post(`/api/knocks/${encodeURIComponent(String(requestId))}/reject`);
});

