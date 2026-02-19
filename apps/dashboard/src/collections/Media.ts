import type { CollectionConfig } from 'payload'
import path from 'path'

/**
 * Media upload directory is resolved from CC_DATA_DIR (same root as the DB).
 * Falls back to <repo>/.cache/data/dashboard/media for dev/production.
 */
const mediaDir = process.env.CC_DATA_DIR
    ? path.resolve(process.env.CC_DATA_DIR, 'media')
    : path.resolve(path.resolve(process.cwd(), '../..'), '.cache', 'data', 'dashboard', 'media')

export const Media: CollectionConfig = {
    slug: 'media',
    access: {
        read: () => true,
    },
    upload: {
        staticDir: mediaDir,
        mimeTypes: ['image/*'],
    },
    fields: [
        {
            name: 'alt',
            type: 'text',
        },
    ],
}
