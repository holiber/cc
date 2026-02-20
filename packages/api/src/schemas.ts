import { z } from 'zod';

// ─── Descriptor ─────────────────────────────────────────────

export const DescriptorSchema = z.object({
    machine: z.string(),
    ip: z.string(),
    runtime: z.string().optional(),
    via: z.string().optional(),
});

// ─── Knock ──────────────────────────────────────────────────

export const KnockRequestSchema = z.object({
    name: z.string().min(1).max(64),
    role: z.enum(['agent', 'reviewer', 'worker', 'orchestrator']),
    intent: z.string().min(1).max(256),
    descriptor: DescriptorSchema,
    secret: z.string().min(4).max(128),
});

export const KnockResponseSchema = z.object({
    requestId: z.string(),
    expiresAt: z.string().datetime(),
    message: z.string(),
});

// ─── Claim ──────────────────────────────────────────────────

export const ClaimRequestSchema = z.object({
    secret: z.string().min(4).max(128),
});

export const TokenResponseSchema = z.object({
    token: z.string(),
    role: z.string(),
    name: z.string(),
    expiresAt: z.string().datetime(),
});

// ─── Admin ──────────────────────────────────────────────────

export const KnockEntrySchema = z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    intent: z.string(),
    descriptor: DescriptorSchema,
    status: z.enum(['pending', 'approved', 'claimed', 'expired', 'rejected']),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
});

export const KnockListSchema = z.object({
    knocks: z.array(KnockEntrySchema),
});

export const ApproveResponseSchema = z.object({
    id: z.string(),
    status: z.literal('approved'),
    message: z.string(),
});

export const RejectResponseSchema = z.object({
    id: z.string(),
    status: z.literal('rejected'),
    message: z.string(),
});

// ─── Health ─────────────────────────────────────────────────

export const HealthSchema = z.object({
    status: z.literal('ok'),
    version: z.string(),
    uptime: z.number(),
});

// ─── Send Message ───────────────────────────────────────────

export const SendMessageSchema = z.object({
    subject: z.string().min(1).max(256),
    body: z.string().max(10_000).optional(),
    to: z.string().min(1).max(64),
    contentType: z.string().max(16).optional(),
    replyTo: z.string().max(64).optional().describe('Message ID to reply to'),
});

export const SendMessageResponseSchema = z.object({
    ok: z.literal(true),
    fromName: z.string(),
    fromRole: z.string(),
});

// ─── Mark Read ──────────────────────────────────────────────

export const MarkReadResponseSchema = z.object({
    ok: z.literal(true),
    id: z.string(),
});

// ─── Error ──────────────────────────────────────────────────

export const ErrorSchema = z.object({
    error: z.string(),
    code: z.string().optional(),
});

// ─── Type exports ───────────────────────────────────────────

export type KnockRequest = z.infer<typeof KnockRequestSchema>;
export type KnockResponse = z.infer<typeof KnockResponseSchema>;
export type ClaimRequest = z.infer<typeof ClaimRequestSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type KnockEntry = z.infer<typeof KnockEntrySchema>;
export type KnockList = z.infer<typeof KnockListSchema>;
export type ApproveResponse = z.infer<typeof ApproveResponseSchema>;
export type RejectResponse = z.infer<typeof RejectResponseSchema>;
export type Health = z.infer<typeof HealthSchema>;
export type Descriptor = z.infer<typeof DescriptorSchema>;
export type SendMessage = z.infer<typeof SendMessageSchema>;
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;
export type MarkReadResponse = z.infer<typeof MarkReadResponseSchema>;
