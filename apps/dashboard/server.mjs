/**
 * Custom dev server wrapper.
 * Wraps the standard Next.js dev server.
 * Also properly forwards HMR WebSocket upgrades to Next.js.
 *
 * Usage: node server.mjs (replaces `next dev`)
 */
import { createServer } from 'http';
import next from 'next';
import { config } from 'dotenv';
import crypto from 'crypto';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import apiAppMod from '@command-center/api/app';
import { WebSocketServer, WebSocket } from 'ws';
import { createTerminalProxy } from 'jabterm/server';
import apiStoreMod from '@command-center/api/store';
import * as messageBus from './src/realtime/messageBus.ts';

config({ path: '.env' });

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';

function isPortFree(port) {
    return new Promise((resolve) => {
        const srv = net.createServer();
        srv.unref();
        srv.once('error', () => resolve(false));
        srv.listen(port, hostname, () => srv.close(() => resolve(true)));
    });
}

function getEphemeralPort() {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.unref();
        srv.once('error', reject);
        srv.listen(0, '127.0.0.1', () => {
            const addr = srv.address();
            const picked = typeof addr === 'object' && addr ? addr.port : null;
            srv.close(() => resolve(picked));
        });
    });
}

const repoRoot = path.resolve(process.cwd(), '../..');
const pidFilePath = path.join(repoRoot, '.cache', 'cc-dev-server.json');

function safeExec(cmd) {
    try {
        return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').trim();
    } catch {
        return '';
    }
}

function findListeningPid(port) {
    // macOS/Linux: lsof prints PIDs for listening sockets.
    const out = safeExec(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`);
    if (!out) return null;
    const first = out.split(/\s+/g).find(Boolean);
    const pid = first ? Number(first) : NaN;
    return Number.isFinite(pid) && pid > 0 ? pid : null;
}

function findFileHolderPid(filePath) {
    const out = safeExec(`lsof -nP -t -- "${filePath}"`);
    if (!out) return null;
    const first = out.split(/\s+/g).find(Boolean);
    const pid = first ? Number(first) : NaN;
    return Number.isFinite(pid) && pid > 0 ? pid : null;
}

function getProcessCommand(pid) {
    // `ps -o command=` prints full command line.
    return safeExec(`ps -p ${pid} -o command=`);
}

function getProcessCwd(pid) {
    const out = safeExec(`lsof -a -p ${pid} -d cwd`);
    if (!out) return '';
    const lines = out.split('\n');
    for (const line of lines) {
        if (line.includes(' cwd ') && line.includes(repoRoot)) {
            const parts = line.trim().split(/\s+/g);
            return parts[parts.length - 1] || '';
        }
    }
    return '';
}

function readPidFile() {
    try {
        const raw = fs.readFileSync(pidFilePath, 'utf8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function writePidFile(data) {
    try {
        fs.mkdirSync(path.dirname(pidFilePath), { recursive: true });
        fs.writeFileSync(pidFilePath, JSON.stringify(data, null, 2));
    } catch {
        // ignore
    }
}

function isOurWorkspaceServerProcess(pid) {
    // Strong check: command line must contain both this repo root and server.mjs.
    const cmd = getProcessCommand(pid);
    if (!cmd) return false;
    const normalized = cmd.replace(/\\/g, '/');
    const rootNorm = repoRoot.replace(/\\/g, '/');
    if (!normalized.includes(rootNorm)) return false;
    if (!normalized.includes('apps/dashboard/server.mjs')) return false;

    // Optional: if pid file matches, that's extra confidence.
    const meta = readPidFile();
    if (meta && meta.pid === pid && meta.repoRoot === repoRoot) return true;

    // If pid file is missing/stale but cmdline matches, accept.
    return true;
}

function isLikelyOurDashboardDevProcess(pid) {
    const cmd = getProcessCommand(pid);
    if (!cmd) return false;
    if (!cmd.includes('node')) return false;
    if (!cmd.includes('server.mjs')) return false;

    const cwd = getProcessCwd(pid);
    return cwd === path.join(repoRoot, 'apps/dashboard');
}

let port = parseInt(process.env.PORT || '3222', 10);
if (dev) {
    if (!Number.isFinite(port) || port <= 0) {
        const picked = await getEphemeralPort();
        if (typeof picked === 'number' && picked > 0) {
            // eslint-disable-next-line no-console
            console.warn(`[dev] PORT=${process.env.PORT} requested; using ephemeral ${picked}.`);
            port = picked;
            process.env.PORT = String(picked);
        } else {
            port = 3222;
        }
    }

    // If the chosen port is busy, pick a free port and warn.
    // This keeps `pnpm dev` usable on busy machines without manual port policing.
    const ok = await isPortFree(port);
    if (!ok) {
        const pid = findListeningPid(port);
        if (pid && (isOurWorkspaceServerProcess(pid) || isLikelyOurDashboardDevProcess(pid))) {
            // eslint-disable-next-line no-console
            console.warn(`[dev] PORT ${port} is busy, but it looks like our previous server (pid ${pid}). Stopping it...`);
            try {
                process.kill(pid, 'SIGTERM');
            } catch {
                // ignore
            }

            // Give the OS a moment to release the socket.
            await new Promise((r) => setTimeout(r, 250));
            const freed = await isPortFree(port);
            if (freed) {
                // eslint-disable-next-line no-console
                console.warn(`[dev] Reusing PORT ${port}.`);
            } else {
                const picked = await getEphemeralPort();
                if (typeof picked === 'number' && picked > 0) {
                    // eslint-disable-next-line no-console
                    console.warn(`[dev] PORT ${port} is still busy. Using ${picked} instead.`);
                    port = picked;
                    process.env.PORT = String(picked);
                }
            }
        } else {
            const picked = await getEphemeralPort();
            if (typeof picked === 'number' && picked > 0) {
                // eslint-disable-next-line no-console
                console.warn(`[dev] PORT ${port} is busy (EADDRINUSE). Using ${picked} instead.`);
                port = picked;
                process.env.PORT = String(picked);
            }
        }
    }
}

// Default Next.js output into repo `.cache/` to avoid writing into apps/dashboard/.
// If another dev server is running, avoid lock conflicts by using a per-port distDir.
// (Tests set NEXT_DIST_DIR explicitly; this only applies when unset.)
if (dev && (!process.env.NEXT_DIST_DIR || process.env.NEXT_DIST_DIR === '')) {
    const baseDistDir = '../../.cache/next-dev';
    const absBase = path.resolve(process.cwd(), baseDistDir);
    const lockPath = path.join(absBase, 'dev', 'lock');
    if (fs.existsSync(lockPath)) {
        const holderPid = findFileHolderPid(lockPath);

        if (!holderPid) {
            // Stale lock file (no process has it open) — safe to remove.
            try { fs.rmSync(lockPath, { force: true }); } catch { /* ignore */ }
        } else if (isOurWorkspaceServerProcess(holderPid) || isLikelyOurDashboardDevProcess(holderPid)) {
            // eslint-disable-next-line no-console
            console.warn(`[dev] Next dev lock detected at ${lockPath}. Stopping previous workspace server (pid ${holderPid})...`);
            try { process.kill(holderPid, 'SIGTERM'); } catch { /* ignore */ }
            await new Promise((r) => setTimeout(r, 250));
            try { fs.rmSync(lockPath, { force: true }); } catch { /* ignore */ }
        }

        if (fs.existsSync(lockPath)) {
            const perPort = `../../.cache/next-dev-${port}`;
            // eslint-disable-next-line no-console
            console.warn(`[dev] Next dev lock still present at ${lockPath}. Using NEXT_DIST_DIR=${perPort}`);
            process.env.NEXT_DIST_DIR = perPort;
        } else {
            process.env.NEXT_DIST_DIR = baseDistDir;
        }
    } else {
        process.env.NEXT_DIST_DIR = baseDistDir;
    }
}

// Record our current dev server so future runs can safely stop it if needed.
if (dev) {
    writePidFile({
        pid: process.pid,
        port,
        repoRoot,
        cwd: process.cwd(),
        nextDistDir: process.env.NEXT_DIST_DIR,
        startedAt: new Date().toISOString(),
    });
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const apiApp = apiAppMod?.default ?? apiAppMod;
const apiStore = apiStoreMod?.default ?? apiStoreMod;

const startTime = Date.now();

if (!process.env.CC_INTERNAL_TOKEN) {
    process.env.CC_INTERNAL_TOKEN = crypto.randomBytes(24).toString('hex');
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

function nodeHeadersToFetchHeaders(nodeHeaders) {
    const headers = new Headers();
    for (const [key, value] of Object.entries(nodeHeaders)) {
        if (value == null) continue;
        if (Array.isArray(value)) headers.set(key, value.join(', '));
        else headers.set(key, String(value));
    }
    return headers;
}

async function sendFetchResponse(res, fetchRes) {
    res.statusCode = fetchRes.status;
    fetchRes.headers.forEach((value, key) => {
        // Avoid breaking Node by sending hop-by-hop headers
        if (key.toLowerCase() === 'transfer-encoding') return;
        res.setHeader(key, value);
    });
    const buf = Buffer.from(await fetchRes.arrayBuffer());
    res.end(buf);
}

function safeJsonParse(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

async function createAdminBroadcastMessageForKnock({ requestId, knockBody }) {
    try {
        const res = await fetch(`http://127.0.0.1:${port}/api/internal/knock-message`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-cc-internal': process.env.CC_INTERNAL_TOKEN,
            },
            body: JSON.stringify({ requestId, knockBody }),
        });
        // Determinism matters for tests; still don't hard-fail the request if it breaks.
        if (!res.ok) await res.text().catch(() => null);
    } catch {
        // ignore
    }
}

async function createPayloadMessage({ subject, body: text, to, contentType, fromName, fromRole }) {
    try {
        const res = await fetch(`http://127.0.0.1:${port}/api/internal/send-message`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-cc-internal': process.env.CC_INTERNAL_TOKEN,
            },
            body: JSON.stringify({ subject, text, to, contentType, fromName, fromRole }),
        });
        if (!res.ok) await res.text().catch(() => null);
    } catch {
        // ignore
    }
}

async function handleApiRequest(req, res) {
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || `${hostname}:${port}`;
    const originalUrl = `${proto}://${host}${req.url}`;

    const u = new URL(originalUrl);
    if (u.pathname === '/api/v1') u.pathname = '/';
    else if (u.pathname.startsWith('/api/v1/')) u.pathname = u.pathname.slice('/api/v1'.length);
    const url = u.toString();

    const isBodyless = req.method === 'GET' || req.method === 'HEAD';
    const bodyBuf = isBodyless ? undefined : await readBody(req);

    const bodyText = bodyBuf ? bodyBuf.toString('utf8') : '';
    const forwarded = new Request(url, {
        method: req.method,
        headers: nodeHeadersToFetchHeaders(req.headers),
        body: isBodyless ? undefined : bodyText,
    });

    const fetchRes = await apiApp.fetch(forwarded);

    try {
        const original = new URL(originalUrl);

        // Side-effect: when a knock is submitted, create the admin-visible message.
        if (req.method === 'POST' && original.pathname === '/api/v1/knock' && fetchRes.ok) {
            const clone = fetchRes.clone();
            const knockResponse = safeJsonParse(await clone.text());
            const requestId = knockResponse?.requestId;
            if (typeof requestId === 'string' && requestId.length > 0) {
                const knockBody = safeJsonParse(bodyText) ?? {};
                await createAdminBroadcastMessageForKnock({ requestId, knockBody });
            }
        }

        // Side-effect: when a message is sent via API, create the Payload message.
        if (req.method === 'POST' && original.pathname === '/api/v1/message' && fetchRes.ok) {
            const clone = fetchRes.clone();
            const apiResult = safeJsonParse(await clone.text());
            if (apiResult?.ok) {
                const msgBody = safeJsonParse(bodyText) ?? {};
                await createPayloadMessage({
                    subject: msgBody.subject,
                    body: msgBody.body,
                    to: msgBody.to,
                    contentType: msgBody.contentType,
                    fromName: apiResult.fromName,
                    fromRole: apiResult.fromRole,
                });
            }
        }
    } catch {
        // ignore
    }

    await sendFetchResponse(res, fetchRes);
}

function normalizeRelIds(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value
            .map((v) => (typeof v === 'string' ? v : v && typeof v === 'object' ? v.id : undefined))
            .filter((v) => typeof v === 'string' && v.length > 0);
    }
    if (typeof value === 'string') return [value];
    if (typeof value === 'object' && value && typeof value.id === 'string') return [value.id];
    return [];
}

async function fetchMeFromCookies(cookieHeader) {
    const url = `http://127.0.0.1:${port}/api/users/me`;
    const res = await fetch(url, {
        headers: cookieHeader ? { cookie: cookieHeader } : {},
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const meUser = json && typeof json === 'object' ? (json.user ?? json) : null;
    const id = meUser && typeof meUser === 'object' ? String(meUser.id || '') : '';
    if (!id) return null;
    return {
        id,
        role: String(meUser.role || ''),
    };
}

function getMessageBusSafe() {
    const fn =
        messageBus.getMessageBus
        ?? (messageBus.default && messageBus.default.getMessageBus)
        ?? messageBus.default;
    if (typeof fn !== 'function') {
        throw new Error('messageBus.getMessageBus is not available');
    }
    return fn();
}

function getTerminalWsTarget() {
    const parsed = Number.parseInt(process.env.NEXT_PUBLIC_TERMINAL_WS_PORT || '3223', 10);
    const port = Number.isFinite(parsed) && parsed > 0 ? parsed : 3223;
    return `ws://127.0.0.1:${port}`;
}

app.prepare().then(() => {
    // Must be called after prepare()
    const nextUpgradeHandler = app.getUpgradeHandler();

    const wss = new WebSocketServer({ noServer: true });
    const wssMessages = new WebSocketServer({ noServer: true });
    const wssTerminal = createTerminalProxy({ upstreamUrl: getTerminalWsTarget() });

    wss.on('connection', (socket) => {
        socket.send(JSON.stringify({ ok: true, event: 'connected', data: { hint: 'Send {method, args} JSON lines.' } }));

        socket.on('message', async (raw) => {
            const text = typeof raw === 'string' ? raw : raw?.toString?.('utf8') ?? '';
            const parsed = safeJsonParse(text);
            if (!parsed || typeof parsed?.method !== 'string') {
                socket.send(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
                return;
            }

            const method = parsed.method;
            const args = parsed.args && typeof parsed.args === 'object' ? parsed.args : {};

            try {
                let result;

                switch (method) {
                    case 'health':
                        result = {
                            status: 'ok',
                            version: '0.1.0',
                            uptime: Math.floor((Date.now() - startTime) / 1000),
                        };
                        break;

                    case 'knock': {
                        const knock = apiStore.createKnock(args);
                        result = {
                            requestId: knock.id,
                            expiresAt: knock.expiresAt,
                            message: 'Knock received. Awaiting admin approval.',
                        };

                        // Best-effort side-effect, awaited so client sees it quickly.
                        await createAdminBroadcastMessageForKnock({ requestId: knock.id, knockBody: args });
                        break;
                    }

                    case 'claim': {
                        const requestId = String(args.requestId || '');
                        const secret = String(args.secret || '');
                        const token = apiStore.claimKnock(requestId, secret);
                        if (!token) throw new Error('Knock not found, not approved, or invalid secret.');
                        result = token;
                        break;
                    }

                    case 'admin.knocks': {
                        const token = String(args.token || '');
                        const status = args.status != null ? String(args.status) : undefined;
                        if (!apiStore.validateAdminToken(token)) throw new Error('Unauthorized');
                        result = { knocks: apiStore.listKnocks(status) };
                        break;
                    }

                    case 'admin.approve': {
                        const token = String(args.token || '');
                        const id = String(args.id || '');
                        if (!apiStore.validateAdminToken(token)) throw new Error('Unauthorized');
                        const knock = apiStore.approveKnock(id);
                        if (!knock) throw new Error('Knock not found or not pending.');
                        result = { id: knock.id, status: 'approved', message: 'Knock approved.' };
                        break;
                    }

                    case 'admin.reject': {
                        const token = String(args.token || '');
                        const id = String(args.id || '');
                        if (!apiStore.validateAdminToken(token)) throw new Error('Unauthorized');
                        const knock = apiStore.rejectKnock(id);
                        if (!knock) throw new Error('Knock not found or not pending.');
                        result = { id: knock.id, status: 'rejected', message: 'Knock rejected.' };
                        break;
                    }

                    case 'message': {
                        const token = String(args.token || '');
                        const agentInfo = apiStore.validateToken(token);
                        const isAdmin = !agentInfo && apiStore.validateAdminToken(token);
                        if (!agentInfo && !isAdmin) throw new Error('Unauthorized');

                        const fromName = agentInfo ? agentInfo.name : 'admin';
                        const fromRole = agentInfo ? agentInfo.role : 'admin';

                        if (!args.subject) throw new Error('subject is required');
                        if (!args.to) throw new Error('to is required');

                        await createPayloadMessage({
                            subject: String(args.subject),
                            body: args.body != null ? String(args.body) : undefined,
                            to: String(args.to),
                            contentType: args.contentType != null ? String(args.contentType) : 'md',
                            fromName,
                            fromRole,
                        });

                        result = { ok: true, fromName, fromRole };
                        break;
                    }

                    default:
                        throw new Error(`Unknown method: ${method}`);
                }

                socket.send(JSON.stringify({ ok: true, data: result }));
            } catch (e) {
                socket.send(JSON.stringify({ ok: false, error: e?.message ? String(e.message) : String(e) }));
            }
        });
    });

    wssMessages.on('connection', async (socket, req) => {
        try {
            const cookie = req?.headers?.cookie || '';
            const me = await fetchMeFromCookies(cookie);
            if (!me) {
                try { socket.close(4401, 'Unauthorized'); } catch { /* ignore */ }
                return;
            }

            const isAdmin = me.role === 'admin';
            const bus = getMessageBusSafe();

            const unsubscribe = bus.on((event) => {
                try {
                    const doc = event?.doc;
                    const toUsers = normalizeRelIds(doc?.toUsers);
                    const broadcastToAdmins = !!doc?.broadcastToAdmins;

                    const canRead = isAdmin
                        ? (broadcastToAdmins || toUsers.includes(me.id))
                        : toUsers.includes(me.id);

                    if (!canRead) return;
                    socket.send(JSON.stringify({ type: event.type, data: { doc }, ts: event.timestamp }));
                } catch {
                    // ignore
                }
            });

            socket.on('close', () => unsubscribe());
            socket.on('error', () => unsubscribe());

            try {
                socket.send(JSON.stringify({ type: 'meta.connected', data: { userId: me.id, role: me.role } }));
            } catch {
                // ignore
            }
        } catch {
            try { socket.close(1011, 'Internal error'); } catch { /* ignore */ }
        }
    });

    const server = createServer(async (req, res) => {
        try {
            if (req.url && (req.url === '/api/v1' || req.url.startsWith('/api/v1/'))) {
                await handleApiRequest(req, res);
                return;
            }

            await handle(req, res);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('Internal server error');
        }
    });

    // Handle WebSocket upgrade requests
    server.on('upgrade', (req, socket, head) => {
        try {
            const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`);
            if (url.pathname === '/ws/messages') {
                wssMessages.handleUpgrade(req, socket, head, (ws) => {
                    wssMessages.emit('connection', ws, req);
                });
                return;
            }
            if (url.pathname === '/ws/terminal') {
                wssTerminal.handleUpgrade(req, socket, head, (ws) => {
                    wssTerminal.emit('connection', ws, req);
                });
                return;
            }
            if (url.pathname === '/connect' || url.pathname === '/api/v1/connect') {
                wss.handleUpgrade(req, socket, head, (ws) => {
                    wss.emit('connection', ws, req);
                });
                return;
            }
        } catch {
            // fall through
        }

        // Forward HMR and other Next.js WebSocket upgrades
        nextUpgradeHandler(req, socket, head);
    });

    server.listen(port, hostname, () => {
        const addr = server.address();
        const actualPort = typeof addr === 'object' && addr ? addr.port : port;
        console.log(`> Ready on http://${hostname}:${actualPort}`);
    });
});
