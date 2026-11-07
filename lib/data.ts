import type { SupabaseClient } from '@supabase/supabase-js'
import { budgetBreakdown, type Profile, type Transaction } from '@/lib/runway'

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Loads one user's profile and transactions (RLS limits it to the signed-in user).
// On the first load of each day it saves the weekly budget, so it can only move 12% a day.
export async function loadRunway(supabase: SupabaseClient, user_id: string) {
  const [p, t] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user_id).maybeSingle<Profile>(),
    supabase.from('transactions').select('*').eq('user_id', user_id).returns<Transaction[]>(),
  ])
  let profile = p.data
  const transactions = t.data ?? []
  const today = isoDate(new Date())

  if (profile && profile.last_budget_date !== today) {
    // Yesterday's saved budget becomes today's anchor
    const rolled = { ...profile, budget_ref: profile.last_weekly_budget, last_budget_date: today }
    rolled.last_weekly_budget = budgetBreakdown(rolled, transactions).weeklyBudget
    const { error } = await supabase
      .from('profiles')
      .update({ budget_ref: rolled.budget_ref, last_weekly_budget: rolled.last_weekly_budget, last_budget_date: today })
      .eq('user_id', user_id)
    if (error) console.error('Budget save failed', error)
    profile = rolled
  }

  return { profile, transactions, error: p.error ?? t.error }
}

export type NightOut = {
  id: string
  budget: number
  taxi_reserve: number
  spent: number
  show_on_lock: boolean
  started_at: string
}

// The user's current night out (not ended), if any
export async function loadActiveNight(supabase: SupabaseClient, user_id: string) {
  const { data, error } = await supabase
    .from('night_outs')
    .select('*')
    .eq('user_id', user_id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle<NightOut>()
  return { night: data, error }
}

// Share of tonight's budget left, 0–1. The taxi reserve is never part of it.
export const nightFuel = (n: NightOut) => Math.max(0, Math.min(1, 1 - Number(n.spent) / Math.max(1, Number(n.budget))))
