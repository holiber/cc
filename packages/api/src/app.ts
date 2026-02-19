import { Elysia } from 'elysia';
import {
    KnockRequestSchema, KnockResponseSchema,
    ClaimRequestSchema, TokenResponseSchema,
    KnockListSchema, ApproveResponseSchema,
    HealthSchema, ErrorSchema,
} from './schemas';
import {
    checkRateLimit, createKnock, claimKnock,
    listKnocks, approveKnock, validateAdminToken,
} from './store';

// ─── Helpers ────────────────────────────────────────────────

const startTime = Date.now();

function extractBearerToken(header: string | undefined): string | null {
    if (!header) return null;
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
}

// ─── App ────────────────────────────────────────────────────

const app = new Elysia()

    // ── Health ──────────────────────────────────────────────
    .get('/health', () => ({
        status: 'ok' as const,
        version: '0.1.0',
        uptime: Math.floor((Date.now() - startTime) / 1000),
    }), {
        response: HealthSchema,
        detail: {
            summary: 'Health check',
            tags: ['Public'],
        },
    })

    // ── Knock ───────────────────────────────────────────────
    .post('/knock', ({ body, request, set }) => {
        const ip = request.headers.get('x-forwarded-for')
            || request.headers.get('x-real-ip')
            || 'unknown';

        if (!checkRateLimit(ip)) {
            set.status = 429;
            return { error: 'Rate limit exceeded. Try again in 30 seconds.', code: 'RATE_LIMITED' };
        }

        const knock = createKnock(body);
        return {
            requestId: knock.id,
            expiresAt: knock.expiresAt,
            message: 'Knock received. Awaiting admin approval.',
        };
    }, {
        body: KnockRequestSchema,
        detail: {
            summary: 'Request access (knock)',
            description: 'Submit a knock request to register as a new agent. Rate-limited to 1 request per 30 seconds per IP. Creates a pending request with a 5 minute TTL.',
            tags: ['Public'],
        },
    })

    .post('/knock/:id/claim', ({ params, body, set }) => {
        const result = claimKnock(params.id, body.secret);
        if (!result) {
            set.status = 404;
            return { error: 'Knock not found, not approved, or invalid secret.', code: 'CLAIM_FAILED' };
        }
        return result;
    }, {
        body: ClaimRequestSchema,
        detail: {
            summary: 'Claim approved knock request',
            description: 'After admin approval, exchange your request ID and secret for an API token.',
            tags: ['Public'],
        },
    })

    // ── Admin routes (auth required) ────────────────────────
    .get('/admin/knocks', ({ request, query, set }) => {
        const token = extractBearerToken(request.headers.get('authorization') ?? undefined);
        if (!token || !validateAdminToken(token)) {
            set.status = 401;
            return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
        }
        return { knocks: listKnocks(query.status) };
    }, {
        detail: {
            summary: 'List knock requests',
            description: 'List all knock requests. Requires admin authentication via Bearer token.',
            tags: ['Admin'],
            security: [{ Bearer: [] }],
        },
    })

    .post('/admin/knocks/:id/approve', ({ request, params, set }) => {
        const token = extractBearerToken(request.headers.get('authorization') ?? undefined);
        if (!token || !validateAdminToken(token)) {
            set.status = 401;
            return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
        }

        const knock = approveKnock(params.id);
        if (!knock) {
            set.status = 404;
            return { error: 'Knock not found or not pending.', code: 'NOT_FOUND' };
        }

        return {
            id: knock.id,
            status: 'approved' as const,
            message: 'Knock approved.',
        };
    }, {
        detail: {
            summary: 'Approve a knock request',
            description: 'Approve a pending knock request so the agent can claim a token.',
            tags: ['Admin'],
            security: [{ Bearer: [] }],
        },
    })

    // ── WebSocket — persistent session ──────────────────────
    /**
     * Connect opens a persistent WebSocket session.
     *
     * Inbound messages: JSON lines  { method: string, args?: unknown }
     * Outbound messages: JSON lines { id?, ok: boolean, data?, error? }
     *
     * Supported methods: health, knock, claim, admin.knocks, admin.approve
     */
    .ws('/connect', {
        async message(ws, raw) {
            let parsed: { method: string; args?: Record<string, unknown> };

            try {
                parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw as any);
            } catch {
                ws.send(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
                return;
            }

            const { method, args = {} } = parsed;

            try {
                let result: unknown;

                switch (method) {
                    case 'health':
                        result = {
                            status: 'ok',
                            version: '0.1.0',
                            uptime: Math.floor((Date.now() - startTime) / 1000),
                        };
                        break;

                    case 'knock': {
                        const knock = createKnock(args as any);
                        result = {
                            requestId: knock.id,
                            expiresAt: knock.expiresAt,
                            message: 'Knock received. Awaiting admin approval.',
                        };
                        break;
                    }

                    case 'claim': {
                        const { requestId, secret } = args as { requestId: string; secret: string };
                        const token = claimKnock(requestId, secret);
                        if (!token) throw new Error('Knock not found, not approved, or invalid secret.');
                        result = token;
                        break;
                    }

                    case 'admin.knocks': {
                        const { token: adminToken, status: statusFilter } = args as { token: string; status?: string };
                        if (!validateAdminToken(adminToken)) throw new Error('Unauthorized');
                        result = { knocks: listKnocks(statusFilter) };
                        break;
                    }

                    case 'admin.approve': {
                        const { token: adminToken, id } = args as { token: string; id: string };
                        if (!validateAdminToken(adminToken)) throw new Error('Unauthorized');
                        const knock = approveKnock(id);
                        if (!knock) throw new Error('Knock not found or not pending.');
                        result = { id: knock.id, status: 'approved', message: 'Knock approved.' };
                        break;
                    }

                    default:
                        throw new Error(`Unknown method: ${method}`);
                }

                ws.send(JSON.stringify({ ok: true, data: result }));
            } catch (err: any) {
                ws.send(JSON.stringify({ ok: false, error: err.message ?? String(err) }));
            }
        },

        open(ws) {
            ws.send(JSON.stringify({ ok: true, event: 'connected', data: { hint: 'Send {method, args} JSON lines.' } }));
        },
    });

// ─── Export ─────────────────────────────────────────────────

export type AppType = typeof app;
export default app;
