import { test, expect } from '@playwright/test';

async function loginAs(page: any, request: any, baseURL: string, email: string, password: string) {
    const loginRes = await request.post('/api/users/login', {
        data: { email, password },
    });
    expect(loginRes.ok(), `${email} login should succeed`).toBeTruthy();
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

test('coder creates progress events; admin sees them in messages', async ({ page, request, baseURL }) => {
    test.setTimeout(180_000);

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const label1 = `E2E coder progress A ${suffix}`;
    const label2 = `E2E coder progress B ${suffix}`;

    // Login as coder and create 2 progress events.
    await loginAs(page, request, baseURL || '', 'coder@cc.local', 'barducks');

    await page.request.post('/api/events/progress', {
        data: { label: label1, current: 2, total: 10, runId: suffix, seq: '1' },
    });
    await page.request.post('/api/events/progress', {
        data: { label: label2, current: 9, total: 10, runId: suffix, seq: '2' },
    });

    // Switch to admin and verify they appear.
    await loginAs(page, request, baseURL || '', 'test@cc.local', process.env.E2E_TEST_PASSWORD || 'barducks');
    await page.goto('/messages', { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });

    const subject1 = `Progress: ${label1}`;
    const subject2 = `Progress: ${label2}`;

    const item1 = page.locator('button', { hasText: subject1 }).first();
    const item2 = page.locator('button', { hasText: subject2 }).first();
    await expect(item1).toBeVisible({ timeout: 120_000 });
    await expect(item2).toBeVisible({ timeout: 120_000 });

    await item1.click();
    await expect(page.getByRole('heading', { name: subject1 })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('span', { hasText: label1 }).first()).toBeVisible({ timeout: 30_000 });
});

