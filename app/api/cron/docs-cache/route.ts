import { NextRequest, NextResponse } from 'next/server'
import { refreshAllDocsAndNavigationCache } from '@/lib/docs/sync-cache'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || process.env.OUTLINE_WEBHOOK_SECRET

  if (!secret) {
    return process.env.NODE_ENV !== 'production'
  }

  const authHeader = request.headers.get('authorization')
  const tokenHeader = request.headers.get('x-cron-secret')
  const querySecret = request.nextUrl.searchParams.get('secret')

  return authHeader === `Bearer ${secret}` || tokenHeader === secret || querySecret === secret
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await refreshAllDocsAndNavigationCache()

    return NextResponse.json({
      success: true,
      message: 'Docs and navigation cache refreshed',
      results,
    })
  } catch (error) {
    console.error('[Cron Docs Cache] Error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
