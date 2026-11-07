import type { SupabaseClient } from '@supabase/supabase-js'
import { loadRunway } from '@/lib/data'
import { CATEGORY_GROUP, summary } from '@/lib/runway'

export type RecordInput = {
  kind: 'shift' | 'spend'
  amount: number
  category: string | null
  note: string
  merchant?: string | null
  ai_categorised?: boolean
  source?: 'manual' | 'bank'
}

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

// Inserts a shift or spend, updates the pot, and returns before/after numbers for the result screen.
// Shared by manual entry, night out and the bank feed.
export async function recordTransaction(supabase: SupabaseClient, user_id: string, input: RecordInput): Promise<AddResult> {
  const { kind, category } = input
  const amount = Math.round(input.amount * 100) / 100
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) return { error: 'Enter a valid amount' }
  if (kind === 'spend' && !(category && Object.hasOwn(CATEGORY_GROUP, category))) return { error: 'Pick a category' }

  const { profile, transactions } = await loadRunway(supabase, user_id)
  if (!profile) return { error: 'No profile yet. Load demo data first.' }

  // A shift is part of the expected shift income, so it moves from "expected" to the pot.
  // A needs spend (food, bills...) is paid from the essentials set aside.
  const isNeeds = kind === 'spend' && CATEGORY_GROUP[category!] === 'needs'
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

  const { error: insertError } = await supabase.from('transactions').insert({
    user_id,
    amount,
    kind,
    category: kind === 'spend' ? category : null,
    note: input.note.slice(0, 80),
    merchant: input.merchant ?? null,
    ai_categorised: input.ai_categorised ?? false,
    source: input.source ?? 'manual',
  })
  if (insertError) return { error: insertError.message }
  const { error: updateError } = await supabase.from('profiles').update(changes).eq('user_id', user_id)
  if (updateError) return { error: updateError.message }

  // Habits only count days before today, so the old transaction list gives the same pace before and after
  const before = summary(profile, transactions)
  const after = summary({ ...profile, ...changes }, transactions)
  const days = Math.abs(after.runway - before.runway)
  return {
    kind,
    amount,
    note: input.note,
    days: Math.round(days * 10) / 10,
    covered: isNeeds && days < 0.05,
    before: { runway: before.runway, allowance: before.allowance },
    after: { runway: after.runway, allowance: after.allowance },
    untilLoan: before.untilLoan,
    now: Date.now(),
  }
}
