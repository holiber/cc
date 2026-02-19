import { WebSocketServer } from 'ws';
import * as pty from 'node-pty';
import os from 'os';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { createRequire } from 'module';
import { config } from 'dotenv';

// Load .env from the dashboard app
config({ path: path.resolve(import.meta.dirname, 'apps/dashboard/.env') });

const PORT = parseInt(process.env.NEXT_PUBLIC_TERMINAL_WS_PORT || '3223', 10);
const require = createRequire(import.meta.url);

/**
 * Try to bind `preferredPort`; if already in use, warn and walk up until a free port is found.
 * Never kills any process. Returns a Promise<number> with the free port.
 */
function findFreePort(preferredPort) {
    return new Promise((resolve, reject) => {
        const tryPort = (p) => {
            const probe = net.createServer();
            probe.once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.warn(
                        `\x1b[33m[terminal-server] WARNING: port ${p} is already in use by another process — trying ${p + 1}.\x1b[0m`
                    );
                    tryPort(p + 1);
                } else {
                    reject(err);
                }
            });
            probe.once('listening', () => probe.close(() => resolve(p)));
            probe.listen(p, '127.0.0.1');
        };
        tryPort(preferredPort);
    });
}


// Helper to fix node-pty permissions on Mac/Linux
function ensureNodePtySpawnHelperExecutable() {
    try {
        const unixTerminalPath = require.resolve("node-pty/lib/unixTerminal.js");
        const pkgRoot = path.resolve(path.dirname(unixTerminalPath), "..");
        const helper = path.join(
            pkgRoot,
            "prebuilds",
            `${process.platform}-${process.arch}`,
            "spawn-helper",
        );

        if (!fs.existsSync(helper)) return;
        const st = fs.statSync(helper);
        const isExecutable = (st.mode & 0o111) !== 0;
        if (isExecutable) return;
        console.log(`Fixing permissions for ${helper}`);
        fs.chmodSync(helper, 0o755);
    } catch (e) {
        console.error('Failed to ensure spawn helper permissions:', e);
    }
}

ensureNodePtySpawnHelperExecutable();

// Resolve the actual port (preferred or next free), then start the server.
const ACTUAL_PORT = await findFreePort(PORT);
if (ACTUAL_PORT !== PORT) {
    console.warn(`\x1b[33m[terminal-server] WARNING: preferred port ${PORT} was busy — bound to ${ACTUAL_PORT} instead.\x1b[0m`);
}

const wss = new WebSocketServer({ port: ACTUAL_PORT });
console.log(`Terminal WebSocket server listening on port ${ACTUAL_PORT}`);

// Helper for locale
function safeLocale() {
    return (
        process.env.LC_ALL ??
        process.env.LANG ??
        (process.platform === "darwin" ? "en_US.UTF-8" : "C.UTF-8")
    );
}

wss.on('connection', (ws) => {
    console.log('[terminal-server] Client connected');

    // Use zsh as default
    const shell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/zsh';
    const cwd = process.env.HOME || process.cwd();
    const env = {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        LANG: safeLocale(),
    };

    console.log(`[terminal-server] Spawning ${shell} in ${cwd}`);

    try {
        // Spawn pty process
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd: cwd,
            env: env,
        });

        // Handle data from pty
        ptyProcess.onData((data) => {
            if (ws.readyState === ws.OPEN) {
                ws.send(data);
            }
        });

        // Handle message from client
        ws.on('message', (message, isBinary) => {
            let handled = false;

            // Heuristic to detect control message even if passed as binary
            try {
                const msgStr = message.toString();
                if (msgStr.startsWith('{')) {
                    const control = JSON.parse(msgStr);
                    if (control.type === 'resize') {
                        // Enforce minimum dimensions to prevent shell crashes
                        const cols = Math.max(control.cols || 80, 10);
                        const rows = Math.max(control.rows || 24, 10);

                        console.log(`[terminal-server] Resizing to ${cols}x${rows}`);
                        try {
                            ptyProcess.resize(cols, rows);
                        } catch (resizeErr) {
                            console.error('[terminal-server] Resize failed:', resizeErr);
                        }
                        handled = true;
                    }
                }
            } catch (e) {
                // Not a valid control message, treat as input
            }

            if (!handled) {
                try {
                    // Input - must be string for node-pty
                    ptyProcess.write(message.toString('utf-8'));
                } catch (err) {
                    console.error('[terminal-server] Error writing to PTY:', err);
                }
            }
        });

        ws.on('close', () => {
            console.log('[terminal-server] Client disconnected');
            try {
                ptyProcess.kill();
            } catch (e) { /* ignore */ }
        });

        ptyProcess.onExit(({ exitCode, signal }) => {
            console.log(`[terminal-server] Process exited with code: ${exitCode}, signal: ${signal}`);
            ws.close();
        });
    } catch (err) {
        console.error('[terminal-server] Failed to spawn pty:', err);
        ws.close();
    }
});
