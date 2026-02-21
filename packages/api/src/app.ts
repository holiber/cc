import { Elysia } from 'elysia';
import {
    KnockRequestSchema,
    ClaimRequestSchema,
    HealthSchema,
    SendMessageSchema,
} from './schemas';
import {
    checkRateLimit, createKnock, claimKnock,
    listKnocks, approveKnock, rejectKnock, validateAdminToken, validateToken,
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

    .post('/admin/knocks/:id/reject', ({ request, params, set }) => {
        const token = extractBearerToken(request.headers.get('authorization') ?? undefined);
        if (!token || !validateAdminToken(token)) {
            set.status = 401;
            return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
        }

        const knock = rejectKnock(params.id);
        if (!knock) {
            set.status = 404;
            return { error: 'Knock not found or not pending.', code: 'NOT_FOUND' };
        }

        return {
            id: knock.id,
            status: 'rejected' as const,
            message: 'Knock rejected.',
        };
    }, {
        detail: {
            summary: 'Reject a knock request',
            description: 'Reject a pending knock request so it cannot be claimed.',
            tags: ['Admin'],
            security: [{ Bearer: [] }],
        },
    })

    // ── Mark message as read ──────────────────────────────────
    .post('/messages/:id/read', ({ request, params, set }) => {
        const token = extractBearerToken(request.headers.get('authorization') ?? undefined);
        if (!token) {
            set.status = 401;
            return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
        }

        const agentInfo = validateToken(token);
        if (agentInfo) {
            return { ok: true as const, id: params.id, callerKey: `api:${agentInfo.name}` };
        }

        if (validateAdminToken(token)) {
            return { ok: true as const, id: params.id, callerKey: 'api:admin' };
        }

        set.status = 401;
        return { error: 'Invalid or expired token', code: 'UNAUTHORIZED' };
    }, {
        detail: {
            summary: 'Mark a message as read',
            description: 'Mark a specific message as read for the authenticated user.',
            tags: ['Authenticated'],
            security: [{ Bearer: [] }],
        },
    })

    // ── Send message (authenticated agents) ──────────────────
    .post('/message', ({ body, request, set }) => {
        const token = extractBearerToken(request.headers.get('authorization') ?? undefined);
        if (!token) {
            set.status = 401;
            return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
        }

        // Accept both agent tokens and admin tokens
        const agentInfo = validateToken(token);
        if (agentInfo) {
            return { ok: true as const, fromName: agentInfo.name, fromRole: agentInfo.role };
        }

        if (validateAdminToken(token)) {
            return { ok: true as const, fromName: 'admin', fromRole: 'admin' };
        }

        set.status = 401;
        return { error: 'Invalid or expired token', code: 'UNAUTHORIZED' };
    }, {
        body: SendMessageSchema,
        detail: {
            summary: 'Send a message',
            description:
                'Send a message to a user or role. ' +
                'The "to" field supports: "admin" (all admins), "orc" (all orchestrators), ' +
                'or "@username" (specific user). Requires a Bearer token from the knock/claim flow.',
            tags: ['Authenticated'],
            security: [{ Bearer: [] }],
        },
    });

// ─── Export ─────────────────────────────────────────────────

export type AppType = typeof app;
export default app;
