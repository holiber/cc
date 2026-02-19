import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Auth middleware — protects all (app) routes behind Payload CMS login.
 * Checks for the `payload-token` cookie that Payload sets on successful login.
 * If missing, redirects the user to /admin/login.
 */
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Skip auth check for these paths
    if (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/opencode') ||
        pathname.startsWith('/favicon') ||
        pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot)$/)
    ) {
        return NextResponse.next()
    }

    // Check for Payload auth cookie
    const token = request.cookies.get('payload-token')

    if (!token) {
        const loginUrl = new URL('/admin/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all paths except:
         * - _next/static, _next/image (Next.js internals)
         * - favicon.ico, sitemap.xml, robots.txt
         */
        '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
}
