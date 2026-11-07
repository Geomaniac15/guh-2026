import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { categorise } from '@/lib/categorise'

// POST /api/categorise { merchant } -> { category, source: 'rule' | 'map' | 'ai' | 'fallback', ai }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { merchant } = await request.json().catch(() => ({}))
  if (typeof merchant !== 'string' || !merchant.trim()) {
    return NextResponse.json({ error: 'merchant is required' }, { status: 400 })
  }
  const result = await categorise(supabase, data.claims.sub, merchant)
  return NextResponse.json({ ...result, ai: result.source === 'ai' })
}
