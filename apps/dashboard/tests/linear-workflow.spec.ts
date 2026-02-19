import { test, expect } from '@playwright/test';

test.describe('Linear Workflow - State Transitions', () => {
    test('nodes transition from planned → in_progress → done', async ({ page }) => {
        test.setTimeout(45_000);
        await page.goto('/experiments/main');

        // Verify we're on linear workflow (default)
        const linearBtn = page.getByTestId('btn-linear');
        await expect(linearBtn).toHaveClass(/bg-blue-600/);

        // Check initial state - all nodes should be "planned"
        const workflowGraph = page.getByTestId('workflow-graph');
        await expect(workflowGraph).toBeVisible();

        // Get node statuses before running
        const step1Node = page.locator('[data-testid="node-step-1"]');
        const step2Node = page.locator('[data-testid="node-step-2"]');
        const step3Node = page.locator('[data-testid="node-step-3"]');
        const step4Node = page.locator('[data-testid="node-step-4"]');

        // All should start as planned
        await expect(step1Node).toHaveAttribute('data-status', 'planned');
        await expect(step2Node).toHaveAttribute('data-status', 'planned');
        await expect(step3Node).toHaveAttribute('data-status', 'planned');
        await expect(step4Node).toHaveAttribute('data-status', 'planned');

        // Click run button
        const runBtn = page.getByTestId('btn-run');
        await runBtn.click();

        // Wait for Step 1 to start (in_progress)
        await expect(step1Node).toHaveAttribute('data-status', 'in_progress', { timeout: 2000 });

        // Wait for Step 1 to complete and Step 2 to start
        await expect(step1Node).toHaveAttribute('data-status', 'done', { timeout: 3000 });
        await expect(step2Node).toHaveAttribute('data-status', 'in_progress', { timeout: 2000 });

        // Wait for all steps to complete
        await expect(step4Node).toHaveAttribute('data-status', 'done', { timeout: 10000 });

        // Verify all nodes are done
        await expect(step1Node).toHaveAttribute('data-status', 'done');
        await expect(step2Node).toHaveAttribute('data-status', 'done');
        await expect(step3Node).toHaveAttribute('data-status', 'done');
        await expect(step4Node).toHaveAttribute('data-status', 'done');
    });

    test('reset button resets workflow to planned state', async ({ page }) => {
        await page.goto('/');

        // Run workflow
        await page.getByTestId('btn-run').click();

        // Wait for completion
        const step4Node = page.locator('[data-testid="node-step-4"]');
        await expect(step4Node).toHaveAttribute('data-status', 'done', { timeout: 10000 });

        // Click reset
        await page.getByTestId('btn-reset').click();

        // Verify all back to planned
        const step1Node = page.locator('[data-testid="node-step-1"]');
        await expect(step1Node).toHaveAttribute('data-status', 'planned');
        await expect(step4Node).toHaveAttribute('data-status', 'planned');
    });
});
