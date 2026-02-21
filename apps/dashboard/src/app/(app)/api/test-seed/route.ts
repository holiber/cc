import { getPayload } from 'payload'
import config from '../../../../payload.config'
import path from 'path'
import fs from 'fs'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    // Block in production — this endpoint writes to the DB with full access
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    const payload = await getPayload({ config })

    try {
        // Look for avatar images relative to the project root
        const avatarDir = path.resolve(process.cwd(), '../../.cache/avatars')
        const avatarPaths: Record<string, string> = {
            admin: path.join(avatarDir, 'admin.png'),
            orchestrator: path.join(avatarDir, 'orchestrator.png'),
            worker: path.join(avatarDir, 'worker.png'),
        }

        const users = await payload.find({
            collection: 'users',
            limit: 100,
        })

        const results = []

        for (const user of users.docs) {
            const avatarPath = avatarPaths[user.role as string]
            if (!avatarPath) continue

            if (!fs.existsSync(avatarPath)) {
                results.push(`Avatar not found for ${user.email} at ${avatarPath}`)
                continue
            }

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

            results.push(`Updated ${user.email} with avatar ${mediaDoc.id}`)
        }

        return NextResponse.json({ success: true, results })
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return NextResponse.json({ success: false, error: msg })
    }
}
