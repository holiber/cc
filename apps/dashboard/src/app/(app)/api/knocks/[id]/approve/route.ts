import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../../../../../payload.config'
import { approveKnock } from '@command-center/api/store'

export const runtime = 'nodejs'

async function requireAdmin(request: Request): Promise<{ id: string; role: string; email?: string } | null> {
    const cookie = request.headers.get('cookie') ?? ''
    if (!cookie) return null

    const meUrl = new URL('/api/users/me', request.url)
    const res = await fetch(meUrl, { headers: { cookie } })
    if (!res.ok) return null
    const json: any = await res.json()
    const user = json?.user ?? json
    if (!user?.id || user?.role !== 'admin') return null
    return { id: String(user.id), role: String(user.role), email: typeof user.email === 'string' ? user.email : undefined }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    const me = await requireAdmin(request)
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const knock = approveKnock(id)
    if (!knock) return NextResponse.json({ error: 'Knock not found or not pending.' }, { status: 404 })

    // Best-effort: update the corresponding Payload message
    try {
        const payload = await getPayload({ config })
        const externalRef = `knock:${id}`
        const found = await payload.find({
            collection: 'messages',
            overrideAccess: true,
            limit: 1,
            where: { externalRef: { equals: externalRef } },
            depth: 0,
        })

        const doc: any | undefined = found?.docs?.[0]
        if (doc?.id) {
            const prevEvent = doc.event ?? {}
            await payload.update({
                collection: 'messages',
                id: String(doc.id),
                overrideAccess: true,
                disableTransaction: true,
                data: {
                    event: {
                        ...prevEvent,
                        status: 'completed',
                        detail: `Approved by ${me.email ?? 'admin'}.`,
                    },
                },
            })
        }
    } catch {
        // ignore
    }

    return NextResponse.json({ id: knock.id, status: 'approved', message: 'Knock approved.' })
}

