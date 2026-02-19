import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    // Allow running multiple Next dev servers from the same repo by isolating `.next`.
    // Used by E2E runner to avoid `.next/dev/lock` conflicts on busy machines.
    distDir: process.env.NEXT_DIST_DIR || '.next',
    async rewrites() {
        const opencodePort = process.env.NEXT_PUBLIC_OPENCODE_PROXY_PORT || '4097'
        return [
            {
                source: '/opencode',
                destination: `http://127.0.0.1:${opencodePort}`,
            },
            {
                source: '/opencode/:path*',
                destination: `http://127.0.0.1:${opencodePort}/:path*`,
            },
        ]
    },
}

export default withPayload(nextConfig)
