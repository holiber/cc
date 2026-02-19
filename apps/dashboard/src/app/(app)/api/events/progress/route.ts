import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import crypto from 'crypto'
import config from '../../../../../payload.config'

export const runtime = 'nodejs'

type ProgressBody = {
    label?: unknown
    current?: unknown
    total?: unknown
    runId?: unknown
    seq?: unknown
}

function asString(v: unknown, fallback = ''): string {
    return typeof v === 'string' ? v : fallback
}

function asNumber(v: unknown, fallback: number): number {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

export async function POST(request: Request) {
    const origin = new URL(request.url).origin
    const cookie = request.headers.get('cookie') ?? ''

    const meRes = await fetch(`${origin}/api/users/me`, {
        headers: {
            cookie,
        },
    })

    if (!meRes.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const meJson: any = await meRes.json().catch(() => null)
    const meUser = meJson?.user ?? meJson
    const role = String(meUser?.role ?? '')
    const userId = meUser?.id ? String(meUser.id) : ''

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (role !== 'coder') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body: ProgressBody = await request.json().catch(() => ({}))
    const label = asString(body.label, '').trim() || 'Progress update'
    const current = asNumber(body.current, 0)
    const total = Math.max(1, asNumber(body.total, 100))
    const runId = asString(body.runId, '').trim()
    const seq = asString(body.seq, '').trim()

    const fromName = String(meUser?.displayName || meUser?.email || 'Coder')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60_000).toISOString()
    const refParts = ['progress', userId, runId || crypto.randomUUID(), seq || String(Date.now())]
    const externalRef = refParts.join(':')

    const payload = await getPayload({ config })
    await payload.create({
        collection: 'messages',
        overrideAccess: true,
        disableTransaction: true,
        data: {
            type: 'progress',
            subject: `Progress: ${label}`,
            fromName,
            fromRole: 'coder',
            broadcastToAdmins: true,
            externalRef,
            expiresAt,
            progress: {
                current,
                total,
                label,
            },
        },
    })

    return NextResponse.json({ ok: true })
}

