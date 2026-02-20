import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../../../../payload.config'

export const runtime = 'nodejs'

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

    const { messageId: rawId, callerKey } = body
    const messageId = rawId != null ? String(rawId) : ''
    if (!messageId) {
        return NextResponse.json({ error: 'messageId is required' }, { status: 400 })
    }
    if (typeof callerKey !== 'string' || !callerKey) {
        return NextResponse.json({ error: 'callerKey is required' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    const doc = await payload.findByID({
        collection: 'messages',
        id: messageId,
        overrideAccess: true,
    }).catch(() => null)

    if (!doc) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const existing: string[] = Array.isArray((doc as any).readBy) ? (doc as any).readBy : []
    if (existing.includes(callerKey)) {
        return NextResponse.json({ ok: true, id: messageId })
    }

    await payload.update({
        collection: 'messages',
        id: messageId,
        overrideAccess: true,
        data: { readBy: [...existing, callerKey] } as any,
    })

    return NextResponse.json({ ok: true, id: messageId })
}
