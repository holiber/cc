import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import fs from 'fs'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Projects } from './collections/Projects'
import { Messages } from './collections/Messages'
import { seedPlugin } from './plugins/seed'

/**
 * CC_DATA_DIR controls where both the SQLite DB and media uploads are stored.
 * Defaults to <repo>/.cache/data/dashboard in dev, set to a temp dir during tests.
 *
 * Example: CC_DATA_DIR=.cache/cc-test-1234 node server.mjs
 */
const repoRoot = path.resolve(process.cwd(), '../..')
const dataDir = process.env.CC_DATA_DIR
    ? path.resolve(process.env.CC_DATA_DIR)
    : path.resolve(repoRoot, '.cache', 'data', 'dashboard')

fs.mkdirSync(dataDir, { recursive: true })

export default buildConfig({
    admin: {
        user: Users.slug,
        meta: {
            titleSuffix: ' | CommandCenter',
        },
        components: {
            graphics: {
                Logo: '/src/components/admin/Logo.tsx#default',
                Icon: '/src/components/admin/Icon.tsx#default',
            },
        },
    },
    collections: [Users, Media, Projects, Messages],
    secret: (() => {
        const s = process.env.PAYLOAD_SECRET
        if (!s && process.env.NODE_ENV === 'production') {
            throw new Error('PAYLOAD_SECRET must be set in production')
        }
        return s || 'command-center-dev-secret-change-me'
    })(),
    db: sqliteAdapter({
        client: {
            url: `file:${path.join(dataDir, 'cc.db')}`,
        },
        push: true,
    }),
    editor: lexicalEditor(),
    typescript: {
        outputFile: path.resolve(process.cwd(), 'src/payload-types.ts'),
    },
    plugins: [seedPlugin()],
})
