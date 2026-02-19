/**
 * 2-actor integration test for the knock flow.
 *
 * Actor 1: Knocker (agent) — uses CLI commands via the reporter
 * Actor 2: Admin — approves knock requests
 *
 * Runs the Elysia app directly (Eden treaty) instead of a live server.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { treaty } from '@elysiajs/eden';
import app from '@command-center/api/app';
import { resetStores } from '@command-center/api';

// Use Eden treaty for in-process requests (no network needed)
const api = treaty(app);

const ADMIN_TOKEN = 'admin-dev-token';

describe('Knock flow — 2 actors', () => {
    beforeEach(() => {
        resetStores();
    });

    it('full flow: knock → admin approve → claim token', async () => {
        // ── Actor 1: Knocker sends knock request ──────────
        const knockRes = await api.knock.post({
            name: 'Revduck',
            role: 'agent',
            intent: 'Register as new reviewer agent',
            descriptor: {
                machine: 'macBook',
                ip: '127.0.0.1',
                runtime: 'node-22',
                via: 'reporter-docker',
            },
            secret: 'my-secret-phrase',
        });

        expect(knockRes.status).toBe(200);
        const knockData = knockRes.data as any;
        expect(knockData.requestId).toMatch(/^knock_/);
        expect(knockData.expiresAt).toBeDefined();
        expect(knockData.message).toContain('Awaiting admin approval');

        const requestId: string = knockData.requestId;

        // ── Actor 2: Admin lists pending knocks ───────────
        const listRes = await api.admin.knocks.get({
            query: { status: 'pending' },
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        });

        expect(listRes.status).toBe(200);
        const listData = listRes.data as any;
        expect(listData.knocks).toHaveLength(1);
        expect(listData.knocks[0].id).toBe(requestId);
        expect(listData.knocks[0].name).toBe('Revduck');
        expect(listData.knocks[0].status).toBe('pending');

        // ── Actor 2: Admin approves the knock ─────────────
        const approveRes = await (api.admin.knocks as any)({ id: requestId }).approve.post(
            {},
            { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } },
        );

        expect(approveRes.status).toBe(200);
        const approveData = approveRes.data as any;
        expect(approveData.status).toBe('approved');

        // ── Actor 1: Knocker claims the token ─────────────
        const claimRes = await (api.knock as any)({ id: requestId }).claim.post({
            secret: 'my-secret-phrase',
        });

        expect(claimRes.status).toBe(200);
        const claimData = claimRes.data as any;
        expect(claimData.token).toMatch(/^tok_/);
        expect(claimData.role).toBe('agent');
        expect(claimData.name).toBe('Revduck');
        expect(claimData.expiresAt).toBeDefined();
    });

    it('rate limiting: second knock within 30s is rejected', async () => {
        const knockPayload = {
            name: 'RateTester',
            role: 'agent' as const,
            intent: 'Test rate limiting',
            descriptor: { machine: 'test', ip: '10.0.0.1' },
            secret: 'secret123',
        };

        // First knock should succeed
        const res1 = await api.knock.post(knockPayload);
        expect(res1.status).toBe(200);

        // Second knock immediately should be rate limited
        const res2 = await api.knock.post(knockPayload);
        expect(res2.status).toBe(429);

        // Eden puts error responses in .error.value
        const body = (res2.error as any)?.value ?? res2.data;
        expect(body.error).toContain('Rate limit');
    });

    it('claim with wrong secret is rejected', async () => {
        // Knock
        const knockRes = await api.knock.post({
            name: 'WrongSecret',
            role: 'worker' as const,
            intent: 'Test wrong secret',
            descriptor: { machine: 'test', ip: '10.0.0.2' },
            secret: 'correct-secret',
        });
        const knockData = knockRes.data as any;
        const requestId = knockData.requestId;

        // Admin approves
        await (api.admin.knocks as any)({ id: requestId }).approve.post(
            {},
            { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } },
        );

        // Claim with WRONG secret
        const claimRes = await (api.knock as any)({ id: requestId }).claim.post({
            secret: 'wrong-secret',
        });

        expect(claimRes.status).toBe(404);
    });

    it('claim before approval is rejected', async () => {
        // Knock
        const knockRes = await api.knock.post({
            name: 'Impatient',
            role: 'agent' as const,
            intent: 'Test early claim',
            descriptor: { machine: 'test', ip: '10.0.0.3' },
            secret: 'my-secret',
        });
        const knockData = knockRes.data as any;
        const requestId = knockData.requestId;

        // Try claiming WITHOUT approval
        const claimRes = await (api.knock as any)({ id: requestId }).claim.post({
            secret: 'my-secret',
        });

        expect(claimRes.status).toBe(404);
    });

    it('admin without token is rejected', async () => {
        const res = await api.admin.knocks.get({
            query: {},
        });
        expect(res.status).toBe(401);
    });
});
