/**
 * Integration tests: AI agents use our MCP server to interact with CommandCenter.
 *
 * Requires:
 *   - A running CC dev server (pnpm dev)
 *   - OPENAI_API_KEY env var
 *   - CC_API_URL env var (defaults to http://localhost:3222/api/v1)
 *
 * Run: pnpm test:integration
 * Cost: ~$0.02 per run (gpt-4o-mini)
 */
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createMCPClient } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';
import path from 'path';
import type { Tool } from 'ai';
import { apiRoutes } from '@command-center/api';
import { callApi } from '../src/callApi.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CC_API_URL = process.env.CC_API_URL || 'http://localhost:3222/api/v1';
const TOKEN = 'admin-dev-token';

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;

function spawnMCPClient(): Promise<MCPClient> {
    const mcpScript = path.resolve(import.meta.dirname, '../src/mcp.ts');
    return createMCPClient({
        transport: new Experimental_StdioMCPTransport({
            command: 'npx',
            args: ['tsx', mcpScript],
            env: { ...process.env as Record<string, string>, CC_API_URL },
            stderr: 'pipe',
        }),
    });
}

function extractToolResultText(tr: any): string | undefined {
    const content = tr.result;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        const textItem = content.find((c: any) => c.type === 'text');
        return textItem?.text;
    }
    return undefined;
}

function assertNoToolErrors(steps: any[]) {
    const toolResults = steps.flatMap((s: any) => s.toolResults);
    for (const tr of toolResults) {
        const text = extractToolResultText(tr);
        if (text) {
            const parsed = JSON.parse(text);
            expect(parsed).not.toHaveProperty('isError', true);
            expect(parsed).not.toHaveProperty('error');
        }
    }
}

// ── Helper: direct API call (deterministic, no AI) ──────────

async function api(routeKey: keyof typeof apiRoutes, args: Record<string, unknown> = {}) {
    return callApi(CC_API_URL, apiRoutes[routeKey], { token: TOKEN, ...args });
}

// ── Single-agent tests ───────────────────────────────────────

describe.skipIf(!OPENAI_API_KEY)('AI Agent via MCP', () => {
    let mcpClient: MCPClient;
    let tools: Record<string, Tool>;

    beforeAll(async () => {
        mcpClient = await spawnMCPClient();
        tools = await mcpClient.tools();
    }, 30_000);

    afterAll(async () => {
        if (mcpClient) await mcpClient.close();
    });

    it('discovers MCP tools including health, message, messages, mark_read', () => {
        const toolNames = Object.keys(tools);
        expect(toolNames).toContain('health');
        expect(toolNames).toContain('message');
        expect(toolNames).toContain('messages');
        expect(toolNames).toContain('mark_read');
    });

    it('AI agent sends a message and lists messages', async () => {
        const uniqueTag = `integration-${Date.now()}`;

        const result = await generateText({
            model: openai('gpt-4o-mini'),
            tools,
            maxSteps: 10,
            prompt: [
                'You are connected to a CommandCenter API via MCP tools.',
                `Your admin token is: ${TOKEN}`,
                '',
                'Do the following steps in order:',
                '1. Call the "health" tool to verify the server is running.',
                `2. Call the "message" tool to send a message to "admin" with subject "${uniqueTag}" and body "Hello from AI integration test".`,
                '3. Call the "messages" tool to list recent messages.',
                '',
                'After completing all steps, summarize the results.',
            ].join('\n'),
        });

        const toolCalls = result.steps.flatMap(s => s.toolCalls);
        const toolNames = toolCalls.map(tc => tc.toolName);

        expect(toolNames).toContain('health');
        expect(toolNames).toContain('message');
        expect(toolNames).toContain('messages');

        const toolResults = result.steps.flatMap(s => s.toolResults);
        expect(toolResults.length).toBeGreaterThanOrEqual(3);
        assertNoToolErrors(result.steps);
    }, 45_000);
});

// ── Two-agent communication test ─────────────────────────────
// Uses callApi for deterministic steps; AI agents for the
// final send + receive verification.

describe.skipIf(!OPENAI_API_KEY)('Two AI Agents communicate via MCP', () => {
    let alphaClient: MCPClient;
    let betaClient: MCPClient;
    let alphaTools: Record<string, Tool>;
    let betaTools: Record<string, Tool>;

    beforeAll(async () => {
        [alphaClient, betaClient] = await Promise.all([
            spawnMCPClient(),
            spawnMCPClient(),
        ]);
        [alphaTools, betaTools] = await Promise.all([
            alphaClient.tools(),
            betaClient.tools(),
        ]);
    }, 30_000);

    afterAll(async () => {
        await Promise.allSettled([
            alphaClient?.close(),
            betaClient?.close(),
        ]);
    });

    it('send, unread check, mark read, reply flow', async () => {
        const uniqueSubject = `alpha-to-beta-${Date.now()}`;

        // 1. Alpha sends a message via AI
        const alphaResult = await generateText({
            model: openai('gpt-4o-mini'),
            tools: alphaTools,
            maxSteps: 3,
            prompt: [
                `You are Agent Alpha. Your admin token is: ${TOKEN}`,
                `Call the "message" tool to send a message to "admin" with subject "${uniqueSubject}" and body "Hello from Alpha".`,
            ].join('\n'),
        });
        expect(alphaResult.steps.flatMap(s => s.toolCalls).map(tc => tc.toolName)).toContain('message');
        assertNoToolErrors(alphaResult.steps);

        // 2. Beta lists unread messages (deterministic callApi)
        const unread1 = await api('messages', { unread: true }) as any;
        expect(unread1.unreadCount).toBeGreaterThanOrEqual(1);
        const alphaMsg = unread1.messages?.find((m: any) => m.subject === uniqueSubject);
        expect(alphaMsg).toBeTruthy();
        const alphaMessageId = alphaMsg.id;

        // 3. Beta marks Alpha's message as read
        const markResult = await api('mark_read', { id: String(alphaMessageId) }) as any;
        expect(markResult.ok).toBe(true);

        // 4. Beta lists unread again -- Alpha's message should be gone
        const unread2 = await api('messages', { unread: true }) as any;
        const stillThere = unread2.messages?.some((m: any) => m.subject === uniqueSubject);
        expect(stillThere).toBeFalsy();

        // 5. Beta replies via AI (tests that replyTo works through MCP)
        const replySubject = `Re: ${uniqueSubject}`;
        const betaReply = await generateText({
            model: openai('gpt-4o-mini'),
            tools: betaTools,
            maxSteps: 3,
            prompt: [
                `You are Agent Beta. Your admin token is: ${TOKEN}`,
                `Call the "message" tool with these exact parameters:`,
                `  subject: "${replySubject}"`,
                `  body: "Reply from Beta"`,
                `  to: "admin"`,
                `  replyTo: "${alphaMessageId}"`,
            ].join('\n'),
        });
        expect(betaReply.steps.flatMap(s => s.toolCalls).map(tc => tc.toolName)).toContain('message');
        assertNoToolErrors(betaReply.steps);

        // 6. Alpha lists all messages and finds Beta's reply with replyTo
        const allMsgs = await api('messages', { limit: 10 }) as any;
        const reply = allMsgs.messages?.find((m: any) => m.subject === replySubject);
        expect(reply).toBeTruthy();
        expect(String(reply.replyTo)).toBe(String(alphaMessageId));
    }, 60_000);
});
