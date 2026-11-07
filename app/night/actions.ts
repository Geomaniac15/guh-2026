'use server'

import { refresh } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { loadActiveNight } from '@/lib/data'
import { addTransaction } from '@/app/dashboard/actions'

async function user() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return { supabase, user_id: data?.claims?.sub as string | undefined }
}

// Starts a night out. The taxi reserve is ring-fenced: it never counts towards tonight's budget.
export async function startNightOut(budget: number, keepTaxi: boolean, showOnLock: boolean) {
  const { supabase, user_id } = await user()
  if (!user_id) return { error: 'Not logged in' }
  budget = Math.round(Number(budget) * 100) / 100
  if (!Number.isFinite(budget) || budget < 1 || budget > 500) return { error: 'Pick a budget between £1 and £500' }

  // Only one night out at a time
  await supabase.from('night_outs').update({ ended_at: new Date().toISOString() }).eq('user_id', user_id).is('ended_at', null)
  const { error } = await supabase
    .from('night_outs')
    .insert({ user_id, budget, taxi_reserve: keepTaxi ? 8 : 0, show_on_lock: showOnLock })
  if (error) return { error: error.message }
  refresh()
  return { ok: true }
}

// Logs a drink/entry/etc: adds to tonight's spent and records a going_out spend (which also updates the pot)
export async function logNightSpend(amount: number) {
  const { supabase, user_id } = await user()
  if (!user_id) return { error: 'Not logged in' }
  const { night } = await loadActiveNight(supabase, user_id)
  if (!night) return { error: 'No night out running' }

  const form = new FormData()
  form.set('kind', 'spend')
  form.set('amount', String(amount))
  form.set('category', 'going_out')
  form.set('note', 'Night out')
  const res = await addTransaction(form)
  if ('error' in res) return { error: res.error }

  const { error } = await supabase
    .from('night_outs')
    .update({ spent: Number(night.spent) + res.amount })
    .eq('id', night.id)
  if (error) return { error: error.message }
  refresh()
  return { ok: true }
}

export async function endNightOut() {
  const { supabase, user_id } = await user()
  if (!user_id) return { error: 'Not logged in' }
  const { error } = await supabase.from('night_outs').update({ ended_at: new Date().toISOString() }).eq('user_id', user_id).is('ended_at', null)
  if (error) return { error: error.message }
  refresh()
  return { ok: true }
}
