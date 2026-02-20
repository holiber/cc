import type { CollectionConfig } from 'payload'
import { getMessageBus } from '../realtime/messageBus'

function isAdmin(req: any): boolean {
    return req?.user?.role === 'admin'
}

function uniqueStrings(items: string[]): string[] {
    return Array.from(new Set(items.filter(Boolean)))
}

function normalizeRelIds(value: unknown): string[] {
    if (!value) return []
    if (Array.isArray(value)) {
        return value
            .map((v) => (typeof v === 'string' ? v : (v as any)?.id))
            .filter((v): v is string => typeof v === 'string' && v.length > 0)
    }
    if (typeof value === 'string') return [value]
    const id = (value as any)?.id
    return typeof id === 'string' ? [id] : []
}

function extractMentions(text: string): string[] {
    // Avoid matching emails (foo@bar.com) by requiring a non-word/dot before '@'
    const re = /(?<![\w.])@([a-zA-Z0-9][a-zA-Z0-9_-]{0,31})/g
    const out: string[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) out.push(m[1].toLowerCase())
    return out
}

export const Messages: CollectionConfig = {
    slug: 'messages',
    admin: {
        useAsTitle: 'subject',
        defaultColumns: ['createdAt', 'type', 'fromName', 'broadcastToAdmins'],
    },
    hooks: {
        afterChange: [
            async ({ doc, operation }) => {
                const bus = getMessageBus()
                bus.emit({
                    type: operation === 'create' ? 'message.created' : 'message.updated',
                    doc,
                    timestamp: new Date().toISOString(),
                })
            },
        ],
        afterDelete: [
            async ({ doc }) => {
                const bus = getMessageBus()
                bus.emit({
                    type: 'message.deleted',
                    doc,
                    timestamp: new Date().toISOString(),
                })
            },
        ],
        beforeChange: [
            async ({ data, req }) => {
                if (!data || !req?.payload) return data

                const text = `${data.subject ?? ''}\n${data.text ?? ''}`
                const usernames = uniqueStrings(extractMentions(text))
                if (usernames.length === 0) return data

                const res = await req.payload.find({
                    collection: 'users',
                    where: {
                        username: {
                            in: usernames,
                        },
                    },
                    limit: Math.max(10, usernames.length),
                })

                const mentionUserIds = res.docs
                    .map((u: any) => u?.id)
                    .filter((id: any): id is string => typeof id === 'string' && id.length > 0)

                const existing = normalizeRelIds((data as any).toUsers)
                ;(data as any).toUsers = uniqueStrings([...existing, ...mentionUserIds])
                return data
            },
        ],
    },
    access: {
        create: ({ req }) => isAdmin(req),
        update: ({ req }) => isAdmin(req),
        delete: ({ req }) => isAdmin(req),
        read: ({ req }) => {
            if (!req.user) return false
            const userId = String(req.user.id)
            if (isAdmin(req)) {
                return {
                    or: [
                        { broadcastToAdmins: { equals: true } },
                        { toUsers: { contains: userId } },
                    ],
                } as any
            }
            return {
                toUsers: { contains: userId },
            } as any
        },
    },
    fields: [
        {
            name: 'type',
            type: 'select',
            required: true,
            options: [
                { label: 'Text', value: 'text' },
                { label: 'Event', value: 'event' },
                { label: 'Progress', value: 'progress' },
                { label: 'Artifact', value: 'artifact' },
            ],
        },
        {
            name: 'subject',
            type: 'text',
            required: true,
            index: true,
        },
        {
            name: 'text',
            type: 'textarea',
        },
        {
            name: 'source',
            type: 'select',
            options: [
                { label: 'GitHub', value: 'github' },
                { label: 'Gitea', value: 'gitea' },
                { label: 'Email', value: 'email' },
                { label: 'Telegram', value: 'telegram' },
                { label: 'Mattermost', value: 'mattermost' },
            ],
        },
        {
            name: 'fromName',
            type: 'text',
            required: true,
        },
        {
            name: 'fromRole',
            type: 'select',
            required: true,
            options: [
                { label: 'User', value: 'user' },
                { label: 'Agent', value: 'agent' },
                { label: 'System', value: 'system' },
                { label: 'Stranger', value: 'stranger' },
                { label: 'Coder', value: 'coder' },
            ],
        },
        {
            name: 'project',
            type: 'relationship',
            relationTo: 'projects',
        },
        {
            name: 'toUsers',
            type: 'relationship',
            relationTo: 'users',
            hasMany: true,
        },
        {
            name: 'broadcastToAdmins',
            type: 'checkbox',
            defaultValue: false,
            index: true,
        },
        {
            name: 'externalRef',
            type: 'text',
            unique: true,
            index: true,
        },
        {
            name: 'expiresAt',
            type: 'date',
            index: true,
        },
        {
            name: 'event',
            type: 'group',
            fields: [
                {
                    name: 'status',
                    type: 'select',
                    options: [
                        { label: 'Submitted', value: 'submitted' },
                        { label: 'Working', value: 'working' },
                        { label: 'Completed', value: 'completed' },
                        { label: 'Failed', value: 'failed' },
                    ],
                },
                { name: 'taskId', type: 'text' },
                { name: 'taskName', type: 'text' },
                { name: 'detail', type: 'textarea' },
            ],
        },
        {
            name: 'progress',
            type: 'group',
            fields: [
                { name: 'current', type: 'number' },
                { name: 'total', type: 'number' },
                { name: 'label', type: 'text' },
            ],
        },
        {
            name: 'artifacts',
            type: 'array',
            fields: [
                {
                    name: 'kind',
                    type: 'select',
                    required: true,
                    options: [
                        { label: 'Image', value: 'image' },
                        { label: 'Video', value: 'video' },
                        { label: 'Markdown', value: 'markdown' },
                        { label: 'MDX', value: 'mdx' },
                        { label: 'TypeScript', value: 'typescript' },
                        { label: 'JavaScript', value: 'javascript' },
                    ],
                },
                { name: 'name', type: 'text', required: true },
                { name: 'url', type: 'text', required: true },
                { name: 'preview', type: 'textarea' },
                { name: 'size', type: 'text' },
                { name: 'language', type: 'text' },
            ],
        },
    ],
}

