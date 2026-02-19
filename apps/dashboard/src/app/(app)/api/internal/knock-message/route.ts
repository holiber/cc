import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../../../../payload.config'

export const runtime = 'nodejs'

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
}

export async function POST(request: Request) {
    const internal = request.headers.get('x-cc-internal') ?? ''
    const expected = process.env.CC_INTERNAL_TOKEN ?? ''
    if (!expected || internal !== expected) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: any = await request.json().catch(() => null)
    const requestId = body?.requestId
    const knockBody = body?.knockBody ?? {}

    if (typeof requestId !== 'string' || requestId.length === 0) {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }

    const name = typeof knockBody?.name === 'string' ? knockBody.name : 'Stranger'
    const intent = typeof knockBody?.intent === 'string' ? knockBody.intent : ''
    const role = typeof knockBody?.role === 'string' ? knockBody.role : ''
    const descriptor = knockBody?.descriptor ?? {}

    const externalRef = `knock:${requestId}`

    for (let attempt = 1; attempt <= 120; attempt++) {
        try {
            const payload = await getPayload({ config })
            await payload.create({
                collection: 'messages',
                overrideAccess: true,
                disableTransaction: true,
                data: {
                    type: 'event',
                    subject: `Knock request from ${name}`,
                    text: [
                        `Intent: ${intent}`,
                        `Role: ${role}`,
                        `Machine: ${descriptor?.machine ?? ''}`,
                        `IP: ${descriptor?.ip ?? ''}`,
                        '',
                        'Admins: approve this request in the admin panel.',
                    ].join('\n'),
                    fromName: name,
                    fromRole: 'stranger',
                    broadcastToAdmins: true,
                    externalRef,
                    event: {
                        status: 'submitted',
                        taskId: requestId,
                        taskName: 'Knock request',
                        detail: 'Awaiting admin approval.',
                    },
                },
            })
            return NextResponse.json({ ok: true })
        } catch (e: any) {
            const msg = e?.message ? String(e.message) : ''
            const low = msg.toLowerCase()
            if (low.includes('unique') || low.includes('duplicate')) {
                return NextResponse.json({ ok: true, deduped: true })
            }
            if (attempt === 120) {
                return NextResponse.json({ ok: false, error: msg || 'Failed to create message' }, { status: 500 })
            }
            await sleep(Math.min(1000, 100 + attempt * 25))
        }
    }

    return NextResponse.json({ ok: false, error: 'Failed to create message' }, { status: 500 })
}

