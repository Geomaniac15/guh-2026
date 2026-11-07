import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// [daysAgo, amount, kind, category, note]: £73.50 over the 7 days before today = £10.50/day pace
const DEMO: [number, number, string, string | null, string][] = [
  [0, 3.85, 'spend', 'food', 'Tesco meal deal'],
  [0, 2.0, 'spend', 'transport', 'Bus to campus'],
  [1, 14.2, 'spend', 'takeaways', 'Deliveroo'],
  [1, 2.0, 'spend', 'transport', 'Bus to campus'],
  [2, 11.4, 'spend', 'going_out', 'Spoons'],
  [2, 3.85, 'spend', 'food', 'Tesco meal deal'],
  [2, 5, 'saving', null, 'Weekly saving'],
  [3, 12.6, 'spend', 'food', 'Aldi food shop'],
  [4, 2.0, 'spend', 'transport', 'Bus to campus'],
  [4, 3.1, 'spend', 'other', 'Coffee'],
  [5, 9.8, 'spend', 'going_out', 'Spoons'],
  [5, 6.5, 'spend', 'transport', 'Uber home'],
  [6, 2.2, 'spend', 'course', 'Printing'],
  [7, 3.85, 'spend', 'food', 'Tesco meal deal'],
  [7, 2.0, 'spend', 'transport', 'Bus to campus'],
]

// POST /api/seed: resets the logged-in user's data to the demo state
export async function POST() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  const user_id = data.claims.sub

  const now = Date.now()
  const midnight = new Date().setHours(0, 0, 0, 0)
  const rows = DEMO.map(([daysAgo, amount, kind, category, note], i) => ({
    user_id,
    amount,
    kind,
    category,
    note,
    // Past rows at noon on their day (inside the 7-day pace window); today's a minute ago
    created_at: new Date(daysAgo ? midnight - daysAgo * 86400000 + 43200000 + i * 1000 : now - 60000 - i * 1000).toISOString(),
  }))

  const results = await Promise.all([
    supabase.from('transactions').delete().eq('user_id', user_id),
    supabase.from('night_outs').delete().eq('user_id', user_id),
  ])
  const profile = await supabase.from('profiles').upsert({
    user_id,
    pot: 900,
    essentials_remaining: 300,
    next_loan_date: '2027-01-10',
    weekly_savings_target: 5,
    ring_mode: 'runway',
    rings: null,
    needs_pct: 65,
    wants_pct: 30,
    savings_pct: 5,
    streak: 5,
  })
  const inserted = await supabase.from('transactions').insert(rows)

  const error = [...results, profile, inserted].find((r) => r.error)?.error
  if (error) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
