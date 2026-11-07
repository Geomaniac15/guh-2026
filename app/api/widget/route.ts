import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadRunway } from '@/lib/data'
import { nudge, summary } from '@/lib/runway'

// GET /api/widget?key=WIDGET_KEY -> demo user's rings and mood for a Scriptable widget. Never returns pounds.
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get('key') ?? ''
  const expected = process.env.WIDGET_KEY ?? ''
  const ok = expected.length > 0 && key.length === expected.length && timingSafeEqual(Buffer.from(key), Buffer.from(expected))
  if (!ok) return NextResponse.json({ error: 'Bad key' }, { status: 401 })

  // Sign in as the demo account so RLS still applies (no service-role key needed)
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: process.env.DEMO_EMAIL ?? '',
    password: process.env.DEMO_PASSWORD ?? '',
  })
  if (authError || !auth.user) {
    console.error(authError)
    return NextResponse.json({ error: 'Demo login failed. Check DEMO_EMAIL / DEMO_PASSWORD.' }, { status: 500 })
  }

  const { profile, transactions, error } = await loadRunway(supabase, auth.user.id)
  if (error || !profile) return NextResponse.json({ error: 'No demo data. Load demo data first.' }, { status: 404 })

  const s = summary(profile, transactions)
  return NextResponse.json(
    {
      rings: s.progress.map((p) => Math.round(p * 1000) / 1000),
      mood: s.mood,
      nudge: nudge(s),
      streak: profile.streak,
      runwayDays: s.runway,
      daysUntilLoan: s.untilLoan,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
