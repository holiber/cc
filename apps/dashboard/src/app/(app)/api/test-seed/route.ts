import { getPayload } from 'payload'
import config from '../../../../payload.config'
import path from 'path'
import fs from 'fs'
import { NextResponse } from 'next/server'

const AVATARS = {
    admin: '/Users/alexonn/.gemini/antigravity/brain/22994ca2-b645-417f-9de7-9a29249e122c/admin_duck_avatar_1771457744460.png',
    orchestrator: '/Users/alexonn/.gemini/antigravity/brain/22994ca2-b645-417f-9de7-9a29249e122c/orchestrator_duck_avatar_1771457757607.png',
    worker: '/Users/alexonn/.gemini/antigravity/brain/22994ca2-b645-417f-9de7-9a29249e122c/worker_duck_avatar_1771457770353.png',
}

export async function GET() {
    const payload = await getPayload({ config })

    try {
        const users = await payload.find({
            collection: 'users',
            limit: 100,
        })

        const results = []

        for (const user of users.docs) {
            // Force update or check

            let avatarPath = ''
            if (user.role === 'admin') avatarPath = AVATARS.admin
            else if (user.role === 'orchestrator') avatarPath = AVATARS.orchestrator
            else if (user.role === 'worker') avatarPath = AVATARS.worker
            else continue

            if (!fs.existsSync(avatarPath)) {
                results.push(`Avatar not found for ${user.email}`)
                continue
            }

            // Check if already has avatar? 
            // We can overwrite to be sure, or check.
            // Let's overwrite/ensure.

            // Read file
            const fileBuffer = fs.readFileSync(avatarPath)

            // Create media
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

            // Update user
            await payload.update({
                collection: 'users',
                id: user.id,
                data: {
                    avatar: mediaDoc.id,
                },
            })

            results.push(`Updated ${user.email} with avatar ${mediaDoc.id}`)
        }

        return NextResponse.json({ success: true, results })
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return NextResponse.json({ success: false, error: msg })
    }
}
