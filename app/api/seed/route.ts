import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// [daysAgo, amount, kind, category, note]: 3 weeks of a typical student, ~£75/week discretionary
const DEMO: [number, number, string, string | null, string][] = [
  [0, 3.85, 'spend', 'food', 'Tesco meal deal'],
  [0, 3.1, 'spend', 'other', 'Coffee'],
  // This week
  [1, 14.2, 'spend', 'takeaways', 'Deliveroo'],
  [1, 3.85, 'spend', 'food', 'Tesco meal deal'],
  [1, 2.0, 'spend', 'transport', 'Bus to campus'],
  [2, 11.4, 'spend', 'going_out', 'Spoons'],
  [2, 5, 'saving', null, 'Weekly saving'],
  [3, 24.99, 'spend', 'shopping', 'ASOS'],
  [3, 18.4, 'spend', 'food', 'Aldi food shop'],
  [4, 3.1, 'spend', 'other', 'Coffee'],
  [4, 2.0, 'spend', 'transport', 'Bus to campus'],
  [5, 9.8, 'spend', 'going_out', 'Spoons'],
  [5, 6.5, 'spend', 'transport', 'Uber home'],
  [6, 8.5, 'spend', 'other', 'Cinema'],
  [6, 2.2, 'spend', 'course', 'Printing'],
  [7, 3.2, 'spend', 'takeaways', 'Greggs'],
  // Last week
  [8, 22.1, 'spend', 'food', 'Tesco food shop'],
  [9, 18.6, 'spend', 'going_out', 'Spoons'],
  [9, 2.0, 'spend', 'transport', 'Bus to campus'],
  [10, 12.99, 'spend', 'takeaways', "Domino's"],
  [10, 48, 'shift', null, 'SU bar'],
  [11, 3.1, 'spend', 'other', 'Coffee'],
  [11, 2.0, 'spend', 'transport', 'Bus to campus'],
  [12, 15.0, 'spend', 'shopping', 'Primark'],
  [12, 3.85, 'spend', 'food', 'Tesco meal deal'],
  [13, 3.2, 'spend', 'takeaways', 'Greggs'],
  [13, 2.0, 'spend', 'transport', 'Bus to campus'],
  [14, 8.0, 'spend', 'going_out', 'Club entry'],
  // Two weeks ago
  [15, 14.3, 'spend', 'going_out', 'Spoons'],
  [15, 19.8, 'spend', 'food', 'Aldi food shop'],
  [16, 16.8, 'spend', 'takeaways', 'Deliveroo'],
  [16, 2.0, 'spend', 'transport', 'Bus to campus'],
  [17, 22.5, 'spend', 'other', 'Gig ticket'],
  [18, 3.1, 'spend', 'other', 'Coffee'],
  [18, 2.0, 'spend', 'transport', 'Bus to campus'],
  [19, 21.4, 'spend', 'going_out', 'Spoons'],
  [20, 3.2, 'spend', 'takeaways', 'Greggs'],
  [20, 12.99, 'spend', 'course', 'Textbook'],
  [21, 11.9, 'spend', 'takeaways', 'Deliveroo'],
  [21, 3.85, 'spend', 'food', 'Tesco meal deal'],
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
    // Past rows at noon on their day; today's a minute ago so they stay "today"
    created_at: new Date(daysAgo ? midnight - daysAgo * 86400000 + 43200000 + i * 1000 : now - 60000 - i * 1000).toISOString(),
  }))

  const results = await Promise.all([
    supabase.from('transactions').delete().eq('user_id', user_id),
    supabase.from('night_outs').delete().eq('user_id', user_id),
    supabase.from('user_merchant_rules').delete().eq('user_id', user_id),
  ])
  const profile = await supabase.from('profiles').upsert({
    user_id,
    pot: 1100,
    essentials_remaining: 420,
    expected_shift_income: 720,
    budget_mode: 'balanced',
    last_weekly_budget: null,
    budget_ref: null,
    last_budget_date: null,
    bank_connected_at: new Date().toISOString(),
    gauge_category: 'going_out',
    gauge_limit: 25,
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
