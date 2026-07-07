// app/api/docs/navigation/route.ts
// API endpoint for fetching navigation tree from local server cache

import { NextRequest, NextResponse } from 'next/server'
import { getNavigationFromCacheOrRefresh } from '@/lib/docs/navigation-cache'

export const dynamic = 'force-dynamic'

function normalizeLang(value: string | null): 'vi' | 'en' {
  return value === 'en' ? 'en' : 'vi'
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lang = normalizeLang(searchParams.get('lang'))

  try {
    const payload = await getNavigationFromCacheOrRefresh(lang)
    
    return NextResponse.json({
      success: true,
      navigation: payload.navigation,
      generatedAt: payload.generatedAt,
      source: 'cache',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    console.error('Error fetching navigation:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}