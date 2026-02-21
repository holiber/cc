import { NextResponse } from 'next/server'
import { buildWsAsyncApiSchema } from '@/realtime/wsSchema'

export const runtime = 'nodejs'

export async function GET() {
    return NextResponse.json(buildWsAsyncApiSchema(), {
        headers: {
            'cache-control': 'no-store',
        },
    })
}

