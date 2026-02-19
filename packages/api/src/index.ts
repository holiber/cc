/**
 * @command-center/api
 *
 * Elysia-based API with Zod validation — single source of truth for types,
 * descriptions, and CLI metadata.
 */

// App + route type
export { default as app } from './app';
export type { AppType } from './app';

// Schemas + types
export {
    KnockRequestSchema, KnockResponseSchema,
    ClaimRequestSchema, TokenResponseSchema,
    KnockEntrySchema, KnockListSchema,
    ApproveResponseSchema, HealthSchema,
    ErrorSchema, DescriptorSchema,
} from './schemas';
export type {
    KnockRequest, KnockResponse,
    ClaimRequest, TokenResponse,
    KnockEntry, KnockList,
    ApproveResponse, Health,
    Descriptor,
} from './schemas';

// Store (for testing / direct usage)
export { resetStores } from './store';

/**
 * Human-readable metadata for every API command.
 * The CLI reads this for --help text — docs live here, NOT in cli.ts.
 */
export const apiMeta = {
    health: {
        summary: 'Health check',
        description: 'Returns server status, version, and uptime.',
    },
    knock: {
        summary: 'Request access (knock)',
        description:
            'Submit a knock request to register as a new agent. ' +
            'Rate-limited to 1 request per 30 seconds per IP. ' +
            'Creates a pending request with a 5-minute TTL.',
    },
    claim: {
        summary: 'Claim approved knock request',
        description:
            'After admin approval, exchange your request ID and secret for an API token.',
    },
    'admin.knocks': {
        summary: 'List knock requests',
        description: 'List all knock requests. Requires admin Bearer token.',
    },
    'admin.approve': {
        summary: 'Approve a knock request',
        description: 'Approve a pending knock request so the agent can claim a token.',
    },
    connect: {
        summary: 'Open a persistent WebSocket session',
        description:
            'Connects to the server over WebSocket. Send commands as JSON lines ' +
            '{"method": "health"} and receive streamed results and events.',
    },
} as const;

export type ApiMetaKey = keyof typeof apiMeta;
