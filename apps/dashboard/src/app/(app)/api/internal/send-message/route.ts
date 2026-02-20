import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../../../../payload.config'

export const runtime = 'nodejs'

const ROLE_TO_FROM_ROLE: Record<string, string> = {
    admin: 'user',
    orchestrator: 'agent',
    worker: 'agent',
    agent: 'agent',
    reviewer: 'agent',
    coder: 'coder',
}

export async function POST(request: Request) {
    const internal = request.headers.get('x-cc-internal') ?? ''
    const expected = process.env.CC_INTERNAL_TOKEN ?? ''
    if (!expected || internal !== expected) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: any = await request.json().catch(() => null)
    if (!body) {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }

    const { subject, text, to, contentType, fromName, fromRole: senderRole } = body
    if (typeof subject !== 'string' || !subject) {
        return NextResponse.json({ error: 'subject is required' }, { status: 400 })
    }
    if (typeof to !== 'string' || !to) {
        return NextResponse.json({ error: 'to is required' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    let broadcastToAdmins = false
    let toUserIds: string[] = []

    if (to === 'admin') {
        broadcastToAdmins = true
    } else if (to === 'orc') {
        const res = await payload.find({
            collection: 'users',
            where: { role: { equals: 'orchestrator' } },
            limit: 100,
            overrideAccess: true,
        })
        toUserIds = res.docs.map((u: any) => String(u.id)).filter(Boolean)
    } else if (to.startsWith('@')) {
        const username = to.slice(1).toLowerCase()
        const res = await payload.find({
            collection: 'users',
            where: { username: { equals: username } },
            limit: 1,
            overrideAccess: true,
        })
        if (res.docs.length === 0) {
            return NextResponse.json({ error: `User @${username} not found` }, { status: 404 })
        }
        toUserIds = [String(res.docs[0].id)]
    } else {
        return NextResponse.json(
            { error: 'Invalid "to" value. Use "admin", "orc", or "@username"' },
            { status: 400 },
        )
    }

    const mappedFromRole = ROLE_TO_FROM_ROLE[senderRole] ?? 'agent'

    try {
        await payload.create({
            collection: 'messages',
            overrideAccess: true,
            data: {
                type: 'text',
                subject,
                text: text ?? '',
                fromName: fromName || 'unknown',
                fromRole: mappedFromRole as any,
                broadcastToAdmins,
                ...(toUserIds.length > 0 ? { toUsers: toUserIds } : {}),
            },
        })
        return NextResponse.json({ ok: true })
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message || 'Failed to create message' },
            { status: 500 },
        )
    }
}
