import { test, expect } from '@playwright/test';

test.describe('Parallel Workflow - State Transitions', () => {
    test('parallel branches run simultaneously and complete together', async ({ page }) => {
        test.setTimeout(30_000);
        await page.goto('/experiments/main');

        // Switch to parallel workflow
        await page.getByTestId('btn-parallel').click();
        await expect(page.getByTestId('btn-parallel')).toHaveClass(/bg-blue-600/);

        // Check initial state
        const startNode = page.locator('[data-testid="node-start"]');
        const branchANode = page.locator('[data-testid="node-branch-a"]');
        const branchBNode = page.locator('[data-testid="node-branch-b"]');
        const endNode = page.locator('[data-testid="node-end"]');

        await expect(startNode).toHaveAttribute('data-status', 'planned');
        await expect(branchANode).toHaveAttribute('data-status', 'planned');
        await expect(branchBNode).toHaveAttribute('data-status', 'planned');
        await expect(endNode).toHaveAttribute('data-status', 'planned');

        // Run workflow
        await page.getByTestId('btn-run').click();

        // Start node runs first
        await expect(startNode).toHaveAttribute('data-status', 'in_progress', { timeout: 2000 });
        await expect(startNode).toHaveAttribute('data-status', 'done', { timeout: 3000 });

        // Both branches should run in parallel
        await expect(branchANode).toHaveAttribute('data-status', 'in_progress', { timeout: 2000 });
        await expect(branchBNode).toHaveAttribute('data-status', 'in_progress', { timeout: 2000 });

        // Both branches complete
        await expect(branchANode).toHaveAttribute('data-status', 'done', { timeout: 5000 });
        await expect(branchBNode).toHaveAttribute('data-status', 'done', { timeout: 5000 });

        // End node runs and completes
        await expect(endNode).toHaveAttribute('data-status', 'done', { timeout: 5000 });
    });
});
