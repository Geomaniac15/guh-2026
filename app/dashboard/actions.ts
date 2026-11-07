'use server'

import { refresh } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CATEGORY_GROUP, daysFor, summary, type Profile, type Transaction } from '@/lib/runway'

export type AddResult =
  | { error: string }
  | {
      kind: 'shift' | 'spend'
      amount: number
      note: string
      days: number
      before: { runway: number; allowance: number }
      after: { runway: number; allowance: number }
      untilLoan: number
      now: number
    }

// Logs a shift or a spend, updates the pot, and returns before/after runway numbers
export async function addTransaction(formData: FormData): Promise<AddResult> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) return { error: 'Not logged in' }
  const user_id = auth.claims.sub

  const kind = formData.get('kind') === 'shift' ? 'shift' : 'spend'
  const note = String(formData.get('note') ?? '').slice(0, 80)
  let amount: number
  let category: string | null = null
  if (kind === 'shift') {
    amount = Number(formData.get('hours')) * Number(formData.get('rate'))
  } else {
    amount = Number(formData.get('amount'))
    category = String(formData.get('category'))
    if (!Object.hasOwn(CATEGORY_GROUP, category)) return { error: 'Pick a category' }
  }
  amount = Math.round(amount * 100) / 100
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) return { error: 'Enter a valid amount' }

  const [{ data: profile }, { data: txs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user_id).single<Profile>(),
    supabase.from('transactions').select('*').eq('user_id', user_id).returns<Transaction[]>(),
  ])
  if (!profile) return { error: 'No profile yet. Load demo data first.' }

  const before = summary(profile, txs ?? [])
  const pot = Number(profile.pot) + (kind === 'shift' ? amount : -amount)

  const { error: insertError } = await supabase.from('transactions').insert({ user_id, amount, kind, category, note })
  if (insertError) return { error: insertError.message }
  const { error: updateError } = await supabase.from('profiles').update({ pot }).eq('user_id', user_id)
  if (updateError) return { error: updateError.message }

  // Before/after at the current pace, so "costs 1.4 days" and 57 → 55.6 agree
  const days = daysFor(amount, txs ?? [])
  const afterProfile = { ...profile, pot }
  const after = summary(afterProfile, txs ?? [])
  refresh()
  return {
    kind,
    amount,
    note,
    days,
    before: { runway: before.runway, allowance: before.allowance },
    after: { runway: after.runway, allowance: after.allowance },
    untilLoan: before.untilLoan,
    now: Date.now(),
  }
}
