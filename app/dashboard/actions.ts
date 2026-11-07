'use server'

import { refresh } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { normaliseMerchant } from '@/lib/categorise'
import { recordTransaction, type AddResult } from '@/lib/record'
import { BUDGET_MODES, CATEGORY_GROUP } from '@/lib/runway'

export type { AddResult }

// Logs a manual (cash) shift or spend
export async function addTransaction(formData: FormData): Promise<AddResult> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) return { error: 'Not logged in' }

  const kind = formData.get('kind') === 'shift' ? 'shift' : 'spend'
  const amount =
    kind === 'shift' ? Number(formData.get('hours')) * Number(formData.get('rate')) : Number(formData.get('amount'))
  const res = await recordTransaction(supabase, auth.claims.sub, {
    kind,
    amount,
    category: kind === 'spend' ? String(formData.get('category')) : null,
    note: String(formData.get('note') ?? ''),
  })
  if (!('error' in res)) refresh()
  return res
}

// Fixes a transaction's category and remembers merchant -> category for future bank transactions
export async function correctCategory(transactionId: string, category: string) {
  if (!Object.hasOwn(CATEGORY_GROUP, category)) return { error: 'Pick a category' }
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) return { error: 'Not logged in' }
  const user_id = auth.claims.sub

  const { data: tx } = await supabase
    .from('transactions')
    .select('id, kind, amount, category, merchant')
    .eq('id', transactionId)
    .eq('user_id', user_id)
    .maybeSingle()
  if (!tx || tx.kind !== 'spend') return { error: 'Only spends have a category' }

  const { error } = await supabase
    .from('transactions')
    .update({ category, ai_categorised: false })
    .eq('id', tx.id)
  if (error) return { error: error.message }

  // Needs spends come out of essentials, so moving between needs and wants moves the money back
  // shortcut: if essentials had already hit £0 when it was logged, this can over-restore slightly
  const was = CATEGORY_GROUP[tx.category ?? '']
  const now = CATEGORY_GROUP[category]
  if (was !== now) {
    const { data: profile } = await supabase.from('profiles').select('essentials_remaining').eq('user_id', user_id).single()
    if (profile) {
      const essentials = Number(profile.essentials_remaining) + (now === 'needs' ? -1 : 1) * Number(tx.amount)
      await supabase.from('profiles').update({ essentials_remaining: Math.max(0, essentials) }).eq('user_id', user_id)
    }
  }

  if (tx.merchant) {
    await supabase
      .from('user_merchant_rules')
      .upsert({ user_id, merchant: normaliseMerchant(tx.merchant), category }, { onConflict: 'user_id,merchant' })
  }
  refresh()
  return { ok: true }
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
