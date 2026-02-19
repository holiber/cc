import type { KnockEntry } from './schemas';
import crypto from 'crypto';

const KNOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── In-memory stores ───────────────────────────────────────

const knocks = new Map<string, KnockEntry & { secretHash: string }>();
const tokens = new Map<string, { token: string; role: string; name: string; expiresAt: Date }>();
const rateLimits = new Map<string, number>(); // ip → last knock timestamp

// ─── Helpers ────────────────────────────────────────────────

function generateId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(12).toString('base64url')}`;
}

function hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
}

function pruneExpired() {
    const now = Date.now();
    for (const [id, knock] of knocks) {
        if (new Date(knock.expiresAt).getTime() < now && knock.status === 'pending') {
            knock.status = 'expired';
        }
    }
}

// ─── Rate limiting ──────────────────────────────────────────

export function checkRateLimit(ip: string, windowMs = 30_000): boolean {
    const last = rateLimits.get(ip);
    if (last && Date.now() - last < windowMs) {
        return false; // too fast
    }
    rateLimits.set(ip, Date.now());
    return true;
}

// ─── Knock operations ───────────────────────────────────────

export function createKnock(data: {
    name: string;
    role: string;
    intent: string;
    descriptor: { machine: string; ip: string; runtime?: string; via?: string };
    secret: string;
}): KnockEntry {
    const id = generateId('knock');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + KNOCK_TTL_MS);

    const entry: KnockEntry & { secretHash: string } = {
        id,
        name: data.name,
        role: data.role,
        intent: data.intent,
        descriptor: data.descriptor,
        status: 'pending',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        secretHash: hashSecret(data.secret),
    };

    knocks.set(id, entry);
    return toPublic(entry);
}

export function listKnocks(statusFilter?: string): KnockEntry[] {
    pruneExpired();
    const result: KnockEntry[] = [];
    for (const knock of knocks.values()) {
        if (!statusFilter || knock.status === statusFilter) {
            result.push(toPublic(knock));
        }
    }
    return result;
}

export function getKnock(id: string): (KnockEntry & { secretHash: string }) | undefined {
    pruneExpired();
    return knocks.get(id);
}

export function approveKnock(id: string): KnockEntry | null {
    pruneExpired();
    const knock = knocks.get(id);
    if (!knock) return null;
    if (knock.status !== 'pending') return null;
    knock.status = 'approved';
    return toPublic(knock);
}

export function claimKnock(id: string, secret: string): { token: string; role: string; name: string; expiresAt: string } | null {
    pruneExpired();
    const knock = knocks.get(id);
    if (!knock) return null;
    if (knock.status !== 'approved') return null;
    if (knock.secretHash !== hashSecret(secret)) return null;

    // Mark as claimed
    knock.status = 'claimed';

    // Generate token
    const token = generateId('tok');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    tokens.set(token, { token, role: knock.role, name: knock.name, expiresAt });

    return { token, role: knock.role, name: knock.name, expiresAt: expiresAt.toISOString() };
}

// ─── Token validation ───────────────────────────────────────

export function validateToken(token: string): { role: string; name: string } | null {
    const entry = tokens.get(token);
    if (!entry) return null;
    if (entry.expiresAt.getTime() < Date.now()) {
        tokens.delete(token);
        return null;
    }
    return { role: entry.role, name: entry.name };
}

// ─── Admin token (simple static check for now) ──────────────

const ADMIN_TOKEN = process.env.CC_ADMIN_TOKEN || 'admin-dev-token';

export function validateAdminToken(token: string): boolean {
    return token === ADMIN_TOKEN;
}

// ─── Utils ──────────────────────────────────────────────────

function toPublic(knock: KnockEntry & { secretHash: string }): KnockEntry {
    const { secretHash, ...pub } = knock;
    return pub;
}

/** Reset all stores (for testing) */
export function resetStores() {
    knocks.clear();
    tokens.clear();
    rateLimits.clear();
}
