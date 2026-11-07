'use server'

import { refresh } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { categorise } from '@/lib/categorise'
import { recordTransaction, type AddResult } from '@/lib/record'

// Demo Bank incoming transactions. Shifts come in as payroll credits.
const FEED: Record<string, { merchant: string; amount: number; kind: 'shift' | 'spend' }> = {
  payroll: { merchant: 'SU BAR PAYROLL', amount: 48, kind: 'shift' },
  nandos: { merchant: 'NANDOS MANCHESTER', amount: 15, kind: 'spend' },
  tesco: { merchant: 'TESCO STORES 2041', amount: 6.4, kind: 'spend' },
  uber: { merchant: 'UBER *TRIP', amount: 9.2, kind: 'spend' },
}

async function user() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return { supabase, user_id: data?.claims?.sub as string | undefined }
}

// "Connect" (or reconnect) Demo Bank: just records when
export async function connectBank() {
  const { supabase, user_id } = await user()
  if (!user_id) return { error: 'Not logged in' }
  const { error } = await supabase.from('profiles').update({ bank_connected_at: new Date().toISOString() }).eq('user_id', user_id)
  if (error) return { error: error.message }
  refresh()
  return { ok: true }
}

// Pushes one Demo Bank transaction through the categoriser and the normal recording logic
export async function simulateBankTransaction(id: string): Promise<AddResult & { category?: string; ai?: boolean }> {
  const item = Object.hasOwn(FEED, id) ? FEED[id] : null
  if (!item) return { error: 'Unknown transaction' }
  const { supabase, user_id } = await user()
  if (!user_id) return { error: 'Not logged in' }

  const cat = item.kind === 'spend' ? await categorise(supabase, user_id, item.merchant) : null
  const res = await recordTransaction(supabase, user_id, {
    kind: item.kind,
    amount: item.amount,
    category: cat?.category ?? null,
    note: item.merchant,
    merchant: item.merchant,
    ai_categorised: cat?.source === 'ai',
    source: 'bank',
  })
  if ('error' in res) return res
  refresh()
  return { ...res, category: cat?.category, ai: cat?.source === 'ai' }
}
