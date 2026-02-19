import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function loginAsDemoAdmin(page: any, request: any, baseURL: string) {
    const loginRes = await request.post('/api/users/login', {
        data: { email: 'demo-admin@cc.local', password: 'barducks' },
    });
    expect(loginRes.ok(), 'demo-admin login should succeed').toBeTruthy();
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

async function runXtermCommand(page: any, cmd: string, waitForText?: string, timeoutMs = 120_000) {
    const container = page.getByTestId('xterm-container');
    await expect(container, 'xterm should be visible').toBeVisible({ timeout: 30_000 });
    await container.click({ position: { x: 10, y: 10 } });
    await page.waitForFunction(() => !!document.querySelector('.xterm-helper-textarea'), null, { timeout: 30_000 });
    await page.evaluate(() => {
        const el = document.querySelector('.xterm-helper-textarea');
        if (el && 'focus' in el) (el as any).focus();
    });
    await page.keyboard.type(cmd, { delay: 10 });
    await page.keyboard.press('Enter');

    if (waitForText) {
        await page.waitForFunction((t) => {
            const el = document.querySelector('.xterm-rows');
            return !!el && (el.textContent || '').includes(String(t));
        }, waitForText, { timeout: timeoutMs });
    }
}

test('demo-admin creates knocks via terminal; sees toast+badge; approves and disapproves', async ({ page, request, baseURL }) => {
    test.setTimeout(240_000);

    await loginAsDemoAdmin(page, request, baseURL || '');
    await page.goto('/messages', { waitUntil: 'domcontentloaded' });

    // Terminal should be open by default on /messages and xterm should mount.
    await expect(page.locator('.xterm-screen')).toBeVisible({ timeout: 30_000 });

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const name1 = `StrangerA-${suffix}`;
    const name2 = `StrangerB-${suffix}`;
    const subj1 = `Knock request from ${name1}`;
    const subj2 = `Knock request from ${name2}`;
    const apiUrl = `${baseURL}/api/v1/knock`;

    // Run CLI knocks from the in-app terminal (PTY starts in $HOME).
    await runXtermCommand(
        page,
        `curl -sS -o /dev/null -w "__KNOCK_A_${suffix}__" -X POST ${apiUrl} -H "content-type: application/json" -H "x-forwarded-for: 10.0.0.11" --data '{"name":"${name1}","role":"agent","intent":"hello","secret":"e2e-secret-phrase","descriptor":{"machine":"playwright","ip":"10.0.0.11","runtime":"node","via":"terminal"}}'`,
        `__KNOCK_A_${suffix}__`,
        120_000,
    );
    await runXtermCommand(
        page,
        `curl -sS -o /dev/null -w "__KNOCK_B_${suffix}__" -X POST ${apiUrl} -H "content-type: application/json" -H "x-forwarded-for: 10.0.0.12" --data '{"name":"${name2}","role":"agent","intent":"hello","secret":"e2e-secret-phrase","descriptor":{"machine":"playwright","ip":"10.0.0.12","runtime":"node","via":"terminal"}}'`,
        `__KNOCK_B_${suffix}__`,
        120_000,
    );

    // E2E disables polling; force a single refresh so badge/toasts/messages reflect new knocks.
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Badge count should become 2 (pending knocks).
    await expect(page.getByTestId('messages-badge')).toHaveText('2', { timeout: 120_000 });

    // Toast notifications should appear and include action buttons.
    const toast1 = page.getByTestId('knock-toast').filter({ hasText: subj1 });
    const toast2 = page.getByTestId('knock-toast').filter({ hasText: subj2 });
    await expect(toast1.first()).toBeVisible({ timeout: 120_000 });
    await expect(toast2.first()).toBeVisible({ timeout: 120_000 });
    await expect(toast1.getByTestId('knock-toast-approve')).toHaveCount(0);
    await expect(toast1.getByTestId('knock-toast-reject')).toHaveCount(0);

    // Messages page should list both knocks (actions are only available in the detail pane).
    const item1 = page.locator('button', { hasText: subj1 }).first();
    const item2 = page.locator('button', { hasText: subj2 }).first();
    await expect(item1).toBeVisible({ timeout: 30_000 });
    await expect(item2).toBeVisible({ timeout: 30_000 });
    await expect(item1.getByTestId('knock-approve')).toHaveCount(0);
    await expect(item1.getByTestId('knock-reject')).toHaveCount(0);

    // Approve/disapprove only after opening the exact message (detail pane).
    await item1.click();
    await expect(page.getByRole('heading', { name: subj1 })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('knock-approve')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('knock-approve').click();

    await item2.click();
    await expect(page.getByRole('heading', { name: subj2 })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('knock-reject')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('knock-reject').click();

    // Force refresh after actions to avoid waiting on background polling.
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Badge should clear (0).
    await expect(page.getByTestId('messages-badge')).toHaveCount(0, { timeout: 30_000 });

    // Status should update in the message details.
    await expect(item1).toBeVisible({ timeout: 30_000 });
    await item1.click();
    await expect(page.getByText('Completed').first()).toBeVisible({ timeout: 30_000 });
    await expect(item2).toBeVisible({ timeout: 30_000 });
    await item2.click();
    await expect(page.getByText('Failed').first()).toBeVisible({ timeout: 30_000 });
});

