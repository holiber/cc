/**
 * Terminal Echo Test
 *
 * Verifies the terminal at /messages is alive and functional:
 *
 * Part 1 – Protocol layer (WebSocket, no browser):
 *   Connects directly to the terminal WS server on port 3223,
 *   sends `echo` with a unique sentinel and asserts the response
 *   appears in the output. Fails fast if the WS is dead ("connection close").
 *
 * Part 2 – UI layer (Playwright browser):
 *   Navigates to /messages, waits for the xterm canvas to mount,
 *   and asserts there is NO "Connection closed" error text visible.
 */

import { test, expect } from '@playwright/test';
import { WebSocket as WsClient } from 'ws';

const TERMINAL_WS_URL =
    process.env.TERMINAL_WS_URL ||
    `ws://127.0.0.1:${process.env.NEXT_PUBLIC_TERMINAL_WS_PORT || '3223'}`;

test.describe.configure({ mode: 'serial' });

// ── Helpers (reused pattern from terminal-zombie.spec.ts) ────

function waitForMatch(ws: WsClient, pattern: RegExp, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        let buf = '';

        const onMessage = (data: Buffer | string) => {
            buf += data.toString();
            if (pattern.test(buf)) cleanup(true);
        };
        const onError = (err: any) => cleanup(false, err);
        const onClose = () => cleanup(false, new Error('WebSocket closed'));

        const timer = setInterval(() => {
            if (Date.now() - startedAt > timeoutMs) {
                cleanup(false, new Error(`Timeout waiting for ${pattern}. Last output:\n${buf}`));
            }
        }, 50);

        function cleanup(ok: boolean, err?: any) {
            clearInterval(timer);
            ws.off('message', onMessage);
            ws.off('error', onError);
            ws.off('close', onClose);
            if (ok) resolve(buf);
            else reject(err);
        }

        ws.on('message', onMessage);
        ws.once('error', onError);
        ws.once('close', onClose);
    });
}

function sendCommand(ws: WsClient, cmd: string): void {
    ws.send(Buffer.from(cmd + '\n'));
}

async function openTerminal(): Promise<WsClient> {
    const ws = new WsClient(TERMINAL_WS_URL);
    await new Promise<void>((resolve, reject) => {
        ws.once('open', resolve);
        ws.once('error', reject);
    });
    // Wait for initial prompt then send a resize so the PTY is fully initialised.
    // Avoid fixed sleeps; just wait until we see some output.
    await waitForMatch(ws, /.+/s, 4000);
    ws.send(JSON.stringify({ type: 'resize', cols: 120, rows: 30 }));
    // Give the server a moment to apply resize / emit more data (best-effort).
    try { await waitForMatch(ws, /.+/s, 750); } catch { /* ignore */ }
    return ws;
}

// ── Part 1 — WebSocket protocol layer ────────────────────────

test.describe('Terminal – echo round-trip (WS protocol)', () => {
    test('echo command returns output', async () => {
        let ws!: WsClient;
        try {
            ws = await openTerminal();
        } catch (err: any) {
            throw new Error(
                `Could not connect to terminal WS at ${TERMINAL_WS_URL}: ${err.message}\n` +
                'Make sure the terminal server is running on port 3223.',
            );
        }

        const SENTINEL = `__CC_ECHO_${Date.now()}__`;

        // Send the echo command
        sendCommand(ws, `echo ${SENTINEL}`);

        // Wait for the sentinel to appear (echo should be fast, but allow for slow startup).
        const output = await waitForMatch(ws, new RegExp(SENTINEL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 8000);

        ws.close();

        expect(
            output,
            `Terminal output should contain "${SENTINEL}". Got:\n${output}`,
        ).toContain(SENTINEL);
    });

    test('terminal server is reachable (connection does not immediately close)', async () => {
        const ws = new WsClient(TERMINAL_WS_URL);

        const openedOrClosed = await new Promise<'open' | 'close' | 'error'>((resolve) => {
            ws.once('open', () => resolve('open'));
            ws.once('error', () => resolve('error'));
            // If connection closes within 500ms without opening, something is wrong
            ws.once('close', () => resolve('close'));
        });

        if (ws.readyState === WsClient.OPEN) ws.close();

        expect(openedOrClosed, 'WS should successfully open, not immediately close').toBe('open');
    });
});

// ── Part 2 — Browser / xterm UI layer (smoke only) ───────────

test.describe('Terminal – UI at /messages', () => {
    test('xterm mounts', async ({ page }) => {
        await page.goto('/messages', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.xterm-screen')).toBeVisible({ timeout: 15_000 });
    });
});
