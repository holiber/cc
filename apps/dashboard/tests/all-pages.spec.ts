import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

/**
 * Unified smoke-check test.
 *
 * One auth session, one sequential flow that:
 * 1. Starts at /command-center  (the main entry point)
 * 2. Uses the burger menu to navigate to every application page
 * 3. On each page checks: no console errors, no Next.js error overlay
 * 4. Also tests: Messages icon click, admin panel login, logout
 *
 * Navigation is done through UI clicks — no direct page.goto() except
 * for the very first page load.
 */

// ────────────────────────────────────────────────────────────

/** Collect console errors AND React warnings (incl. hydration mismatches). */
function startErrorCollector(page: Page) {
    const errors: string[] = [];
    const handler = (msg: ConsoleMessage) => {
        const type = msg.type();
        if (type !== 'error' && type !== 'warning') return;
        const text = msg.text();
        // Ignore benign dev-mode noise
        if (text.includes('Failed to load resource') && text.includes('404')) return;
        if (text.includes('Download the React DevTools')) return;
        // Ignore terminal WS connection errors (expected if terminal-server hasn't warmed up yet)
        if (text.includes('terminal-ws') || (text.includes('WebSocket') && text.includes('3223'))) return;
        errors.push(`[${type}] ${text}`);
    };
    page.on('console', handler);
    return {
        errors,
        stop: () => page.off('console', handler),
        /** Drain & assert no errors/warnings, then keep collecting for the next page. */
        assertClean(label: string) {
            expect(errors, `${label} — should have no console errors or warnings`).toEqual([]);
            errors.length = 0; // reset for next page
        },
    };
}

/** Assert no Next.js error overlay is showing. */
async function assertNoOverlay(page: Page, label: string) {
    const count = await page.locator('nextjs-portal [data-nextjs-dialog]').count();
    expect(count, `${label} — should not show Next.js error overlay`).toBe(0);
}

/** Open the burger menu, click a nav item, wait for navigation. */
async function navigateViaMenu(page: Page, linkText: string) {
    // Open menu
    await page.click('button[aria-label="Toggle menu"]');
    await page.waitForTimeout(400); // let animation finish

    // Find and click the matching nav link
    const link = page.locator('a').filter({ hasText: linkText }).first();
    await expect(link).toBeVisible({ timeout: 3_000 });
    await link.click();

    // Wait for navigation to settle
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300); // let animations finish
}

// ────────────────────────────────────────────────────────────

test.describe('Smoke check', () => {
    test('full UI navigation — all pages reachable without errors', async ({ page }) => {
        const collector = startErrorCollector(page);

        // ── 1. Start at CommandCenter ──────────────────────────
        await page.goto('/command-center', { waitUntil: 'networkidle' });
        await assertNoOverlay(page, 'CommandCenter');
        collector.assertClean('CommandCenter');

        // ── 2. Messages icon is visible on CommandCenter ───────
        const msgIcon = page.locator('a[aria-label="Messages"]');
        await expect(msgIcon, 'Messages icon on CommandCenter').toBeVisible({ timeout: 5_000 });

        // ── 3. Click Messages icon → /messages ─────────────────
        await msgIcon.click();
        await page.waitForURL('**/messages', { timeout: 10_000 });
        await page.waitForLoadState('networkidle');
        await assertNoOverlay(page, 'Messages');
        collector.assertClean('Messages');

        // ── 4. Use burger menu to visit each page ──────────────

        // → CommandCenter
        await navigateViaMenu(page, 'CommandCenter');
        await page.waitForURL('**/command-center', { timeout: 10_000 });
        await assertNoOverlay(page, 'CommandCenter (via menu)');
        collector.assertClean('CommandCenter (via menu)');

        // → Experiments
        await navigateViaMenu(page, 'Experiments');
        await page.waitForURL('**/experiments/**', { timeout: 10_000 });
        await assertNoOverlay(page, 'Experiments');
        collector.assertClean('Experiments');

        // → Agent v1 (Orchestration)
        await navigateViaMenu(page, 'Agent v1');
        await page.waitForURL('**/orchestration', { timeout: 10_000 });
        await assertNoOverlay(page, 'Agent v1');
        collector.assertClean('Agent v1');

        // → Agent v2 (Orchestration v2)
        await navigateViaMenu(page, 'Agent v2');
        await page.waitForURL('**/orchestration-v2', { timeout: 10_000 });
        await assertNoOverlay(page, 'Agent v2');
        collector.assertClean('Agent v2');

        // → Messages (via menu)
        await navigateViaMenu(page, 'Messages');
        await page.waitForURL('**/messages', { timeout: 10_000 });
        await assertNoOverlay(page, 'Messages (via menu)');
        collector.assertClean('Messages (via menu)');

        collector.stop();
    });
});

// ── Admin panel (separate context — no auth cookie) ─────────

test.describe('Admin panel', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('login and dashboard reachable without errors', async ({ page }) => {
        const collector = startErrorCollector(page);

        // Load admin login page
        await page.goto('/admin', { waitUntil: 'networkidle' });
        await expect(page.locator('input[id="field-email"]')).toBeVisible({ timeout: 10_000 });
        await assertNoOverlay(page, 'Admin login');
        collector.assertClean('Admin login');

        // Log in
        await page.fill('input[id="field-email"]', 'test@cc.local');
        await page.fill('input[id="field-password"]', process.env.E2E_TEST_PASSWORD || 'barducks');
        await page.click('button[type="submit"]');

        // Wait for dashboard
        await page.waitForURL('**/admin', { timeout: 15_000 });
        await expect(page.locator('nav').first()).toBeVisible({ timeout: 10_000 });
        await assertNoOverlay(page, 'Admin dashboard');
        collector.assertClean('Admin dashboard');

        collector.stop();
    });
});

// ── Logout ──────────────────────────────────────────────────

test.describe('Logout', () => {
    test('logout button in menu redirects to login page', async ({ page }) => {
        await page.goto('/command-center', { waitUntil: 'networkidle' });

        // Open menu
        await page.click('button[aria-label="Toggle menu"]');
        await page.waitForTimeout(500);

        // Click logout
        const logoutBtn = page.locator('#logout-button');
        await expect(logoutBtn).toBeVisible({ timeout: 5_000 });
        await logoutBtn.click();

        // Should redirect to admin login
        await page.waitForURL('**/admin/login**', { timeout: 10_000 });
        await expect(page.locator('input[id="field-email"]')).toBeVisible({ timeout: 10_000 });
    });
});
