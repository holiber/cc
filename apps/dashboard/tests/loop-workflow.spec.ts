import { test, expect } from '@playwright/test';

test.describe('Loop Workflow - State Transitions', () => {
    test('loop iterates 3 times before completing', async ({ page }) => {
        test.setTimeout(45_000);
        await page.goto('/experiments/main');

        // Switch to loop workflow
        await page.getByTestId('btn-loop').click();
        await expect(page.getByTestId('btn-loop')).toHaveClass(/bg-blue-600/);

        // Check initial state - using new node names
        const initNode = page.locator('[data-testid="node-initialize"]');
        const fetchNode = page.locator('[data-testid="node-fetch-data"]');
        const processNode = page.locator('[data-testid="node-process"]');
        const updateNode = page.locator('[data-testid="node-update"]');
        const doneNode = page.locator('[data-testid="node-complete"]');

        await expect(initNode).toHaveAttribute('data-status', 'planned');

        // Run workflow
        await page.getByTestId('btn-run').click();

        // Init runs first
        await expect(initNode).toHaveAttribute('data-status', 'in_progress', { timeout: 2000 });
        await expect(initNode).toHaveAttribute('data-status', 'done', { timeout: 3000 });

        // Wait for loop counter to show iteration 1
        const loopCounter = page.getByTestId('loop-counter');
        await expect(loopCounter).toContainText('1', { timeout: 3000 });

        // Wait for loop counter to show iteration 2
        await expect(loopCounter).toContainText('2', { timeout: 5000 });

        // Wait for loop counter to show iteration 3
        await expect(loopCounter).toContainText('3', { timeout: 5000 });

        // Wait for completion
        await expect(doneNode).toHaveAttribute('data-status', 'done', { timeout: 10000 });

        // Verify final state
        await expect(initNode).toHaveAttribute('data-status', 'done');
        await expect(fetchNode).toHaveAttribute('data-status', 'done');
        await expect(processNode).toHaveAttribute('data-status', 'done');
        await expect(updateNode).toHaveAttribute('data-status', 'done');
        await expect(doneNode).toHaveAttribute('data-status', 'done');
    });
});
