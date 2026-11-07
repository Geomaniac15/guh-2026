'use server'

import { refresh } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { loadRunway } from '@/lib/data'
import { BUDGET_MODES, CATEGORY_GROUP, summary } from '@/lib/runway'

export type AddResult =
  | { error: string }
  | {
      kind: 'shift' | 'spend'
      amount: number
      note: string
      days: number
      covered: boolean // a needs spend paid from essentials, so runway is unchanged
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

  const { profile, transactions } = await loadRunway(supabase, user_id)
  if (!profile) return { error: 'No profile yet. Load demo data first.' }

  // A shift is part of the expected shift income, so it moves from "expected" to the pot.
  // A needs spend (food, bills...) is paid from the essentials set aside.
  const isNeeds = category !== null && CATEGORY_GROUP[category] === 'needs'
  const changes =
    kind === 'shift'
      ? {
          pot: Number(profile.pot) + amount,
          expected_shift_income: Math.max(0, Number(profile.expected_shift_income) - amount),
        }
      : {
          pot: Number(profile.pot) - amount,
          ...(isNeeds && { essentials_remaining: Math.max(0, Number(profile.essentials_remaining) - amount) }),
        }

  const { error: insertError } = await supabase.from('transactions').insert({ user_id, amount, kind, category, note })
  if (insertError) return { error: insertError.message }
  const { error: updateError } = await supabase.from('profiles').update(changes).eq('user_id', user_id)
  if (updateError) return { error: updateError.message }

  // Habits only count days before today, so the old transaction list gives the same pace before and after
  const before = summary(profile, transactions)
  const after = summary({ ...profile, ...changes }, transactions)
  const days = Math.abs(after.runway - before.runway)
  refresh()
  return {
    kind,
    amount,
    note,
    days: Math.round(days * 10) / 10,
    covered: isNeeds && days < 0.05,
    before: { runway: before.runway, allowance: before.allowance },
    after: { runway: after.runway, allowance: after.allowance },
    untilLoan: before.untilLoan,
    now: Date.now(),
  }
}

// Saver / Balanced / Relaxed. Clears the gradual-change anchor so the new mode applies straight away.
export async function setBudgetMode(mode: string) {
  if (!Object.hasOwn(BUDGET_MODES, mode)) return { error: 'Unknown mode' }
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) return { error: 'Not logged in' }

  const { error } = await supabase
    .from('profiles')
    .update({ budget_mode: mode, budget_ref: null, last_weekly_budget: null, last_budget_date: null })
    .eq('user_id', auth.claims.sub)
  if (error) return { error: error.message }
  refresh()
  return { ok: true }
}
