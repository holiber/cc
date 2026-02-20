/**
 * @command-center/api
 *
 * Elysia-based API with Zod validation — single source of truth for types,
 * descriptions, and CLI metadata.
 */

import { z } from 'zod';

// App + route type
export { default as app } from './app';
export type { AppType } from './app';

// Schemas + types
export {
    KnockRequestSchema, KnockResponseSchema,
    ClaimRequestSchema, TokenResponseSchema,
    KnockEntrySchema, KnockListSchema,
    ApproveResponseSchema, RejectResponseSchema, HealthSchema,
    ErrorSchema, DescriptorSchema,
    SendMessageSchema, SendMessageResponseSchema,
} from './schemas';
export type {
    KnockRequest, KnockResponse,
    ClaimRequest, TokenResponse,
    KnockEntry, KnockList,
    ApproveResponse, RejectResponse, Health,
    Descriptor,
    SendMessage, SendMessageResponse,
} from './schemas';

import {
    KnockRequestSchema, ClaimRequestSchema, SendMessageSchema,
} from './schemas';

// Store (for testing / direct usage)
export { resetStores, setKnockHooks } from './store';
export type { KnockHooks } from './store';

// ─── Route Registry ─────────────────────────────────────────
// Single source of truth for every API command.
// CLI, MCP, and callApi all derive from this — no per-command boilerplate.

export type RouteDefinition = {
    method: 'GET' | 'POST';
    path: string;
    summary: string;
    description: string;
    auth?: 'admin' | 'token';
    bodySchema?: z.ZodObject<any>;
    pathParams?: z.ZodObject<any>;
    querySchema?: z.ZodObject<any>;
    omitFromCli?: string[];
    autoFill?: Record<string, 'descriptor'>;
    extraParams?: z.ZodObject<any>;
};

export const apiRoutes = {
    health: {
        method: 'GET' as const,
        path: '/health',
        summary: 'Health check',
        description: 'Returns server status, version, and uptime.',
    },
    knock: {
        method: 'POST' as const,
        path: '/knock',
        summary: 'Request access (knock)',
        description:
            'Submit a knock request to register as a new agent. ' +
            'Rate-limited to 1 request per 30 seconds per IP. ' +
            'Creates a pending request with a 5-minute TTL.',
        bodySchema: KnockRequestSchema,
        omitFromCli: ['descriptor'],
        autoFill: { descriptor: 'descriptor' as const },
        extraParams: z.object({
            ip: z.string().optional().describe(
                'Set x-forwarded-for (helps avoid rate-limit collisions in tests)',
            ),
        }),
    },
    claim: {
        method: 'POST' as const,
        path: '/knock/:requestId/claim',
        summary: 'Claim approved knock request',
        description:
            'After admin approval, exchange your request ID and secret for an API token.',
        bodySchema: ClaimRequestSchema,
        pathParams: z.object({
            requestId: z.string().describe('Knock request ID'),
        }),
    },
    'admin.knocks': {
        method: 'GET' as const,
        path: '/admin/knocks',
        summary: 'List knock requests',
        description: 'List all knock requests. Requires admin Bearer token.',
        auth: 'admin' as const,
        querySchema: z.object({
            status: z.string().optional().describe(
                'Filter by status (pending|approved|claimed|expired|rejected)',
            ),
        }),
    },
    'admin.approve': {
        method: 'POST' as const,
        path: '/admin/knocks/:id/approve',
        summary: 'Approve a knock request',
        description: 'Approve a pending knock request so the agent can claim a token.',
        auth: 'admin' as const,
        pathParams: z.object({
            id: z.string().describe('Knock request ID to approve'),
        }),
    },
    'admin.reject': {
        method: 'POST' as const,
        path: '/admin/knocks/:id/reject',
        summary: 'Reject a knock request',
        description: 'Reject a pending knock request so it cannot be claimed.',
        auth: 'admin' as const,
        pathParams: z.object({
            id: z.string().describe('Knock request ID to reject'),
        }),
    },
    message: {
        method: 'POST' as const,
        path: '/message',
        summary: 'Send a message',
        description:
            'Send a message to a user or role. ' +
            'The "to" field supports: "admin" (all admins), "orc" (all orchestrators), ' +
            'or "@username" (specific user). Requires a Bearer token.',
        auth: 'token' as const,
        bodySchema: SendMessageSchema,
    },
    connect: {
        method: 'GET' as const,
        path: '/connect',
        summary: 'Open a persistent WebSocket session',
        description:
            'Connects to the server over WebSocket. Send commands as JSON lines ' +
            '{"method": "health"} and receive streamed results and events.',
    },
} satisfies Record<string, RouteDefinition>;

export type ApiRouteKey = keyof typeof apiRoutes;

/** @deprecated Use apiRoutes instead */
export const apiMeta = apiRoutes;
