/**
 * Terminal Zombie Process Test
 *
 * Verifies that when a terminal WebSocket connection is closed (simulating
 * a user closing a tab), the underlying PTY process is killed and does NOT
 * become a zombie (orphaned process consuming resources).
 *
 * How it works:
 * 1. Connect to the terminal server via WebSocket
 * 2. Read the PID of the shell process by running `echo $$`
 * 3. Close the WebSocket connection
 * 4. Wait a short period for cleanup
 * 5. Check via `ps` that the PID no longer exists
 */

import { test, expect } from '@playwright/test';
import { WebSocket as WsClient } from 'ws';

const TERMINAL_WS_URL =
    process.env.TERMINAL_WS_URL ||
    `ws://127.0.0.1:${process.env.NEXT_PUBLIC_TERMINAL_WS_PORT || '3223'}`;
const CLEANUP_DELAY_MS = 1500; // Give node-pty time to kill the process

test.describe.configure({ mode: 'serial' });

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

/** Send a command and wait for the output to settle */
function sendCommand(ws: WsClient, cmd: string): void {
    const encoded = Buffer.from(cmd + '\n');
    ws.send(encoded);
}

test.describe('Terminal – zombie process prevention', () => {
    test('pty process is killed when websocket closes', async () => {
        // Connect to terminal server
        const ws = new WsClient(TERMINAL_WS_URL);

        await new Promise<void>((resolve, reject) => {
            ws.once('open', resolve);
            ws.once('error', reject);
        });

        // Wait for initial prompt
        await waitForMatch(ws, /.+/s, 4000);

        // Send resize to init process properly
        ws.send(JSON.stringify({ type: 'resize', cols: 80, rows: 24 }));
        try { await waitForMatch(ws, /.+/s, 1000); } catch { /* ignore */ }

        // Ask shell for its PID
        sendCommand(ws, 'echo __PID__$$__END__');

        // Wait for the shell to respond with PID
        const rawOutput = await waitForMatch(ws, /__PID__(\d+)__END__/, 8000);

        // Extract PID from output (between __PID__ and __END__)
        const pidMatch = rawOutput.match(/__PID__(\d+)__END__/);
        expect(pidMatch, 'Should capture the shell PID from output').not.toBeNull();

        const shellPid = pidMatch![1];
        console.log(`Shell PID: ${shellPid}`);

        // Verify the process is actually running before we close
        const { execSync } = await import('child_process');
        let isRunningBefore: boolean;
        try {
            execSync(`kill -0 ${shellPid} 2>/dev/null`);
            isRunningBefore = true;
        } catch {
            isRunningBefore = false;
        }
        expect(isRunningBefore, `Process ${shellPid} should be running before close`).toBe(true);

        // Close the WebSocket — this should trigger ptyProcess.kill() on the server
        ws.close();

        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, CLEANUP_DELAY_MS));

        // Verify the process is NOT running anymore (not a zombie)
        let isRunningAfter: boolean;
        try {
            execSync(`kill -0 ${shellPid} 2>/dev/null`);
            isRunningAfter = true;
        } catch {
            isRunningAfter = false;
        }

        // Also check it's not in zombie state (Z in ps output)
        let isZombie = false;
        try {
            const psOut = execSync(`ps -p ${shellPid} -o stat= 2>/dev/null || true`).toString();
            isZombie = psOut.includes('Z');
        } catch {
            // ps errored = process doesn't exist, which is what we want
        }

        expect(isRunningAfter, `Process ${shellPid} should be dead after WebSocket close`).toBe(false);
        expect(isZombie, `Process ${shellPid} should not be in zombie state`).toBe(false);
    });

    test('multiple tab close does not leave zombie processes', async () => {
        const { execSync } = await import('child_process');
        const pids: string[] = [];

        // Open 3 terminal tabs (connections)
        const sockets: WsClient[] = [];
        for (let i = 0; i < 3; i++) {
            const ws = new WsClient(TERMINAL_WS_URL);
            await new Promise<void>((resolve, reject) => {
                ws.once('open', resolve);
                ws.once('error', reject);
            });
            sockets.push(ws);

            // Wait for prompt and send resize
            await waitForMatch(ws, /.+/s, 4000);
            ws.send(JSON.stringify({ type: 'resize', cols: 80, rows: 24 }));

            // Get this shell's PID
            sendCommand(ws, `echo __PID__$$__END__`);
            const out = await waitForMatch(ws, /__PID__(\d+)__END__/, 8000);
            const m = out.match(/__PID__(\d+)__END__/);
            if (m) {
                pids.push(m[1]);
                console.log(`Tab ${i + 1} PID: ${m[1]}`);
            }
        }

        expect(pids.length, 'Should capture PIDs for all 3 tabs').toBe(3);

        // Verify all are running
        for (const pid of pids) {
            let running: boolean;
            try { execSync(`kill -0 ${pid} 2>/dev/null`); running = true; } catch { running = false; }
            expect(running, `PID ${pid} should be running before close`).toBe(true);
        }

        // Close all sockets
        for (const ws of sockets) {
            ws.close();
        }

        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, CLEANUP_DELAY_MS * 1.5));

        // Check all are dead
        for (const pid of pids) {
            let running: boolean;
            try { execSync(`kill -0 ${pid} 2>/dev/null`); running = true; } catch { running = false; }

            let isZombie = false;
            try {
                const psOut = execSync(`ps -p ${pid} -o stat= 2>/dev/null || true`).toString();
                isZombie = psOut.includes('Z');
            } catch { /**/ }

            expect(running, `PID ${pid} should be dead after close`).toBe(false);
            expect(isZombie, `PID ${pid} should not be zombie`).toBe(false);
        }
    });
});
