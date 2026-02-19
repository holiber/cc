import type { Payload, Config } from 'payload'
import * as path from 'path'
import * as fs from 'fs'
import { mockMessages } from '../data/mockMessages'

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'barducks'
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'barducks'
const DEV_ADMIN_EMAIL = process.env.CC_DEV_ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || ''

interface SeedUser {
    email: string
    password: string
    role: 'admin' | 'orchestrator' | 'worker'
    displayName: string
    username: string
}

const SEED_USERS: SeedUser[] = [
    {
        email: 'admin@cc.local',
        password: SEED_PASSWORD,
        role: 'admin',
        displayName: 'Admin',
        username: 'admin',
    },
    {
        email: 'orc@cc.local',
        password: SEED_PASSWORD,
        role: 'orchestrator',
        displayName: 'Orchestrator',
        username: 'orc',
    },
    {
        email: 'worker@cc.local',
        password: SEED_PASSWORD,
        role: 'worker',
        displayName: 'Worker',
        username: 'worker',
    },
    {
        email: 'demo-admin@cc.local',
        password: SEED_PASSWORD,
        role: 'admin',
        displayName: 'Demo Admin',
        username: 'demo-admin',
    },
    {
        email: 'test@cc.local',
        password: E2E_TEST_PASSWORD,
        role: 'admin',
        displayName: 'E2E Test',
        username: 'test',
    },
]

// Optional: seed a local dev admin user without committing personal emails.
// Usage: CC_DEV_ADMIN_EMAIL="you@example.com" (in .env, which is gitignored).
if (typeof DEV_ADMIN_EMAIL === 'string' && DEV_ADMIN_EMAIL.includes('@')) {
    const username = DEV_ADMIN_EMAIL.split('@')[0].trim().toLowerCase() || 'dev-admin'
    SEED_USERS.push({
        email: DEV_ADMIN_EMAIL.trim().toLowerCase(),
        password: SEED_PASSWORD,
        role: 'admin',
        displayName: 'Dev Admin',
        username,
    })
}

const AVATARS = {
    admin: path.join(process.cwd(), 'src/assets/avatars/admin_duck_avatar_1771457744460.png'),
    orchestrator: path.join(process.cwd(), 'src/assets/avatars/orchestrator_duck_avatar_1771457757607.png'),
    worker: path.join(process.cwd(), 'src/assets/avatars/worker_duck_avatar_1771457770353.png'),
}

export const seedPlugin = () => {
    return (incomingConfig: Config): Config => {
        const existingOnInit = incomingConfig.onInit

        return {
            ...incomingConfig,
            onInit: async (payload: Payload) => {
                if (existingOnInit) await existingOnInit(payload)

                payload.logger.info('🌱 Ensuring seed data...')

                const userIdsByEmail = await ensureUsers(payload)
                await seedAvatars(payload)

                const demoAdminId = userIdsByEmail['demo-admin@cc.local']
                const projectIdsBySlug = await ensureProjects(payload, userIdsByEmail)
                await ensureMessages(payload, { demoAdminId, projectIdsBySlug })

                payload.logger.info('🌱 Seed ensure complete.')
            },
        }
    }
}

function slugify(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 64) || 'project'
}

async function ensureUsers(payload: Payload): Promise<Record<string, string>> {
    const ids: Record<string, string> = {}

    for (const user of SEED_USERS) {
        const existing = await payload.find({
            collection: 'users',
            where: { email: { equals: user.email } },
            limit: 1,
        })

        if (existing.totalDocs > 0) {
            const doc: any = existing.docs[0]
            ids[user.email] = doc.id

            // Keep role/displayName/username aligned (do not reset password on existing users).
            await payload.update({
                collection: 'users',
                id: doc.id,
                data: {
                    role: user.role,
                    displayName: user.displayName,
                    username: user.username,
                },
            })
            continue
        }

        const created = await payload.create({
            collection: 'users',
            data: user,
        })
        ids[user.email] = (created as any).id
        payload.logger.info(`✅ Ensured ${user.role}: ${user.email}`)
    }

    return ids
}

async function ensureProjects(payload: Payload, userIdsByEmail: Record<string, string>) {
    const defs = [
        { name: 'CommandCenter', slug: 'commandcenter', members: ['demo-admin@cc.local', 'admin@cc.local', 'orc@cc.local', 'worker@cc.local'] },
        { name: 'workflow-viz', slug: 'workflow-viz', members: ['demo-admin@cc.local', 'admin@cc.local', 'orc@cc.local'] },
        { name: 'infrastructure', slug: 'infrastructure', members: ['demo-admin@cc.local', 'admin@cc.local'] },
        { name: 'knowledge-base', slug: 'knowledge-base', members: ['demo-admin@cc.local', 'admin@cc.local'] },
        { name: 'design-system', slug: 'design-system', members: ['demo-admin@cc.local', 'admin@cc.local'] },
    ] as const

    const idsBySlug: Record<string, string> = {}

    for (const def of defs) {
        const existing = await payload.find({
            collection: 'projects',
            where: { slug: { equals: def.slug } },
            limit: 1,
        })

        const memberIds = def.members.map((email) => userIdsByEmail[email]).filter(Boolean)

        if (existing.totalDocs > 0) {
            const doc: any = existing.docs[0]
            idsBySlug[def.slug] = doc.id
            await payload.update({
                collection: 'projects',
                id: doc.id,
                data: {
                    name: def.name,
                    slug: def.slug,
                    members: memberIds,
                },
            })
            continue
        }

        const created = await payload.create({
            collection: 'projects',
            data: {
                name: def.name,
                slug: def.slug,
                members: memberIds,
            },
        })
        idsBySlug[def.slug] = (created as any).id
    }

    return idsBySlug
}

async function ensureMessages(
    payload: Payload,
    opts: { demoAdminId?: string; projectIdsBySlug: Record<string, string> },
) {
    const existing = await payload.find({
        collection: 'messages',
        limit: 1,
    })
    if (existing.totalDocs > 0) return

    for (const msg of mockMessages) {
        const projectSlug = msg.project ? slugify(msg.project) : undefined
        const projectId = projectSlug ? opts.projectIdsBySlug[projectSlug] : undefined

        const addMention =
            msg.id === 'msg-001' || msg.id === 'msg-004' || msg.id === 'msg-010'
                ? '\n\nFYI @demo-admin'
                : ''

        await payload.create({
            collection: 'messages',
            data: {
                type: msg.type,
                subject: msg.subject || `${msg.type.toUpperCase()} — ${msg.id}`,
                text: msg.text ? `${msg.text}${addMention}` : addMention || undefined,
                source: msg.source,
                fromName: msg.from.name,
                fromRole: msg.from.role === 'agent' ? 'agent' : msg.from.role === 'system' ? 'system' : 'user',
                ...(projectId ? { project: projectId } : {}),
                ...(opts.demoAdminId ? { toUsers: [opts.demoAdminId] } : {}),
                broadcastToAdmins: false,
                externalRef: `seed:${msg.id}`,
                ...(msg.event ? { event: msg.event } : {}),
                ...(msg.progress ? { progress: msg.progress } : {}),
                ...(msg.artifacts ? { artifacts: msg.artifacts.map((a) => ({ ...a, url: a.url || '#' })) } : {}),
            },
        })
    }
}

async function seedAvatars(payload: Payload) {
    payload.logger.info('🦆 Checking duck avatars...')

    const users = await payload.find({
        collection: 'users',
        limit: 100,
    })

    for (const doc of users.docs) {
        const user = doc as any; // Cast to any to avoid strict typing issues with generated types
        if (user.avatar) continue

        let avatarPath = ''
        if (user.role === 'admin') avatarPath = AVATARS.admin
        else if (user.role === 'orchestrator') avatarPath = AVATARS.orchestrator
        else if (user.role === 'worker') avatarPath = AVATARS.worker
        else continue

        if (!fs.existsSync(avatarPath)) {
            // payload.logger.error(`❌ Avatar file not found: ${avatarPath}`)
            continue
        }

        try {
            const fileBuffer = fs.readFileSync(avatarPath)
            const mediaDoc = await payload.create({
                collection: 'media',
                data: {
                    alt: `${user.displayName} Avatar`,
                },
                file: {
                    data: fileBuffer,
                    name: path.basename(avatarPath),
                    mimetype: 'image/png',
                    size: fileBuffer.length,
                },
            })

            await payload.update({
                collection: 'users',
                id: user.id,
                data: {
                    avatar: mediaDoc.id,
                },
            })
            payload.logger.info(`✅ Set avatar for ${user.email}`)
        } catch (error) {
            payload.logger.error(`❌ Failed to set avatar for ${user.email}: ${error}`)
        }
    }
}
