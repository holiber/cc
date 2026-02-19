import type { Payload, Config } from 'payload'
import * as path from 'path'
import * as fs from 'fs'

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'barducks'
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'barducks'


interface SeedUser {
    email: string
    password: string
    role: 'admin' | 'orchestrator' | 'worker'
    displayName: string
}

const SEED_USERS: SeedUser[] = [
    {
        email: 'admin@cc.local',
        password: SEED_PASSWORD,
        role: 'admin',
        displayName: 'Admin',
    },
    {
        email: 'orc@cc.local',
        password: SEED_PASSWORD,
        role: 'orchestrator',
        displayName: 'Orchestrator',
    },
    {
        email: 'worker@cc.local',
        password: SEED_PASSWORD,
        role: 'worker',
        displayName: 'Worker',
    },
    {
        email: 'test@cc.local',
        password: E2E_TEST_PASSWORD,
        role: 'admin',
        displayName: 'E2E Test',
    },
]

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

                // Only seed if no users exist
                const { totalDocs } = await payload.find({
                    collection: 'users',
                    limit: 1,
                })

                if (totalDocs > 0) {
                    payload.logger.info('📋 Users already exist, skipping user creation.')
                    await seedAvatars(payload)
                    return
                }

                payload.logger.info('🌱 Seeding initial users...')

                for (const user of SEED_USERS) {
                    try {
                        await payload.create({
                            collection: 'users',
                            data: user,
                        })
                        payload.logger.info(`✅ Created ${user.role}: ${user.email}`)
                    } catch (error) {
                        payload.logger.error(`❌ Failed to create ${user.email}: ${error}`)
                    }
                }

                payload.logger.info('🌱 Seeding complete.')
                await seedAvatars(payload)
            },
        }
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
