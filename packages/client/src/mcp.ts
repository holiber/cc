#!/usr/bin/env node
/**
 * CommandCenter MCP Server — exposes the CC API as MCP tools.
 *
 * Tool names and descriptions are derived from apiMeta (the same source
 * used by the CLI).  Zod schemas from @command-center/api define the
 * input parameters.
 *
 * Usage:
 *   CC_API_URL=https://rccc.gatocube.com/api/v1 node packages/client/src/mcp.ts
 *
 * Or add to .cursor/mcp.json:
 *   { "command": "node", "args": ["packages/client/src/mcp.ts"],
 *     "env": { "CC_API_URL": "https://rccc.gatocube.com/api/v1" } }
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import os from 'os';

import { apiMeta } from '@command-center/api';
import { createClient } from './client.js';

const CC_API_URL = process.env.CC_API_URL || 'http://localhost:3222/api/v1';

const server = new McpServer({
    name: 'command-center',
    version: '0.1.0',
});

function makeClient() {
    return createClient(CC_API_URL);
}

function autoDescriptor() {
    return {
        machine: os.hostname(),
        ip: '127.0.0.1',
        runtime: `node-${process.versions.node}`,
        via: 'mcp',
    };
}

function textResult(data: unknown): { content: { type: 'text'; text: string }[] } {
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(msg: string): { content: { type: 'text'; text: string }[]; isError: true } {
    return { content: [{ type: 'text' as const, text: msg }], isError: true };
}

// ── health ───────────────────────────────────────────────────

server.tool(
    'health',
    apiMeta.health.description,
    {},
    async () => {
        const client = makeClient();
        const { data, error, status } = await client.health.get();
        if (error) return errorResult(`Health check failed (${status})`);
        return textResult(data);
    },
);

// ── knock ────────────────────────────────────────────────────

server.tool(
    'knock',
    apiMeta.knock.description,
    {
        name: z.string().min(1).max(64).describe('Agent name'),
        role: z.enum(['agent', 'reviewer', 'worker', 'orchestrator']).describe('Agent role'),
        intent: z.string().min(1).max(256).describe('Why are you requesting access?'),
        secret: z.string().min(4).max(128).describe('Secret passphrase for later claiming the token'),
    },
    async ({ name, role, intent, secret }) => {
        const client = makeClient();
        const { data, error, status } = await client.knock.post({
            name,
            role,
            intent,
            secret,
            descriptor: autoDescriptor(),
        });
        if (error) return errorResult(`Knock failed (${status}): ${(error as any)?.value?.error ?? 'unknown'}`);
        return textResult(data);
    },
);

// ── claim ────────────────────────────────────────────────────

server.tool(
    'claim',
    apiMeta.claim.description,
    {
        requestId: z.string().describe('Knock request ID returned by the knock tool'),
        secret: z.string().min(4).max(128).describe('Secret used during the knock request'),
    },
    async ({ requestId, secret }) => {
        const client = makeClient();
        const { data, error, status } = await (client.knock as any)(
            { id: requestId },
        ).claim.post({ secret });
        if (error) return errorResult(`Claim failed (${status}): ${(error as any)?.value?.error ?? 'unknown'}`);
        return textResult(data);
    },
);

// ── admin_knocks ─────────────────────────────────────────────

server.tool(
    'admin_knocks',
    apiMeta['admin.knocks'].description,
    {
        token: z.string().describe('Admin Bearer token'),
        status: z.string().optional().describe('Filter by status: pending, approved, claimed, expired, rejected'),
    },
    async ({ token, status }) => {
        const client = makeClient();
        const { data, error, status: httpStatus } = await client.admin.knocks.get({
            query: { status },
            headers: { Authorization: `Bearer ${token}` },
        });
        if (error) return errorResult(`List knocks failed (${httpStatus}): ${(error as any)?.value?.error ?? 'unknown'}`);
        return textResult(data);
    },
);

// ── admin_approve ────────────────────────────────────────────

server.tool(
    'admin_approve',
    apiMeta['admin.approve'].description,
    {
        token: z.string().describe('Admin Bearer token'),
        id: z.string().describe('Knock request ID to approve'),
    },
    async ({ token, id }) => {
        const client = makeClient();
        const { data, error, status } = await (client.admin.knocks as any)(
            { id },
        ).approve.post({}, { headers: { Authorization: `Bearer ${token}` } });
        if (error) return errorResult(`Approve failed (${status}): ${(error as any)?.value?.error ?? 'unknown'}`);
        return textResult(data);
    },
);

// ── admin_reject ─────────────────────────────────────────────

server.tool(
    'admin_reject',
    apiMeta['admin.reject'].description,
    {
        token: z.string().describe('Admin Bearer token'),
        id: z.string().describe('Knock request ID to reject'),
    },
    async ({ token, id }) => {
        const client = makeClient();
        const { data, error, status } = await (client.admin.knocks as any)(
            { id },
        ).reject.post({}, { headers: { Authorization: `Bearer ${token}` } });
        if (error) return errorResult(`Reject failed (${status}): ${(error as any)?.value?.error ?? 'unknown'}`);
        return textResult(data);
    },
);

// ── start ────────────────────────────────────────────────────

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
