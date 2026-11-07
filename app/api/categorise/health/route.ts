import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { askQwen, ollamaConfig } from '@/lib/categorise'

// GET /api/categorise/health -> { engine: 'qwen' | 'unavailable', model, latencyMs, category?, error? }
// Sends one test merchant straight to Qwen (skipping rules and the map) to check this server can reach it.
export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const started = Date.now()
  const result = await askQwen('DELIVEROO')
  const latencyMs = Date.now() - started
  return NextResponse.json(
    {
      engine: result.category ? 'qwen' : 'unavailable',
      model: ollamaConfig().model,
      latencyMs,
      ...(result.category ? { category: result.category } : { error: result.error }),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
