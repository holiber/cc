import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../../../../payload.config'

export const runtime = 'nodejs'

export async function GET(request: Request) {
    const internal = request.headers.get('x-cc-internal') ?? ''
    const expected = process.env.CC_INTERNAL_TOKEN ?? ''
    if (!expected || internal !== expected) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const fromName = url.searchParams.get('fromName') || ''
    const role = url.searchParams.get('role') || ''
    const callerKey = url.searchParams.get('callerKey') || ''
    const unreadOnly = url.searchParams.get('unread') === 'true'
    const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100)

    const payload = await getPayload({ config })

    const isAdmin = role === 'admin'

    const baseWhere: any = isAdmin
        ? { broadcastToAdmins: { equals: true } }
        : { fromName: { equals: fromName } }

    const result = await payload.find({
        collection: 'messages',
        where: baseWhere,
        limit: 100,
        sort: '-createdAt',
        overrideAccess: true,
    })

    const allDocs = result.docs
    let unreadCount = 0

    if (callerKey) {
        unreadCount = allDocs.filter((doc: any) => {
            const readBy: string[] = Array.isArray(doc.readBy) ? doc.readBy : []
            return !readBy.includes(callerKey)
        }).length
    }

    let filteredDocs = allDocs
    if (unreadOnly && callerKey) {
        filteredDocs = allDocs.filter((doc: any) => {
            const readBy: string[] = Array.isArray(doc.readBy) ? doc.readBy : []
            return !readBy.includes(callerKey)
        })
    }

    const messages = filteredDocs.slice(0, limit).map((doc: any) => {
        const rawReply = doc.replyTo
        const replyToId = rawReply == null ? null
            : typeof rawReply === 'object' ? rawReply.id
            : rawReply
        return {
            id: doc.id,
            type: doc.type,
            subject: doc.subject,
            text: doc.text,
            fromName: doc.fromName,
            fromRole: doc.fromRole,
            replyTo: replyToId,
            createdAt: doc.createdAt,
        }
    })

    return NextResponse.json({ messages, totalDocs: result.totalDocs, unreadCount })
}
