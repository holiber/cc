#!/usr/bin/env node
/**
 * CommandCenter MCP Server — fully auto-generated from apiRoutes.
 *
 * Tool names, descriptions, and parameter schemas are all derived from
 * the route registry. Adding a new endpoint only requires editing
 * app.ts + schemas.ts + index.ts.
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

import { apiRoutes } from '@command-center/api';
import type { RouteDefinition } from '@command-center/api';
import { callApi, routeToParamShape } from './callApi.js';

const CC_API_URL = process.env.CC_API_URL || 'http://localhost:3222/api/v1';

const server = new McpServer({
    name: 'command-center',
    version: '0.1.0',
});

function textResult(data: unknown): { content: { type: 'text'; text: string }[] } {
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(msg: string): { content: { type: 'text'; text: string }[]; isError: true } {
    return { content: [{ type: 'text' as const, text: msg }], isError: true };
}

// ── Auto-register all API routes as MCP tools ────────────────

for (const [name, route] of Object.entries(apiRoutes) as [string, RouteDefinition][]) {
    if (name === 'connect') continue;

    const toolName = name.replace(/\./g, '_');
    const shape = routeToParamShape(route);

    server.tool(
        toolName,
        route.description,
        shape,
        async (args: Record<string, unknown>) => {
            try {
                const data = await callApi(CC_API_URL, route, args);
                return textResult(data);
            } catch (e: any) {
                return errorResult(e.message ?? String(e));
            }
        },
    );
}

// ── start ────────────────────────────────────────────────────

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
