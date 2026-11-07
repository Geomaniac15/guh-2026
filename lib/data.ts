import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile, Transaction } from '@/lib/runway'

// Loads one user's profile and transactions (RLS limits it to the signed-in user)
export async function loadRunway(supabase: SupabaseClient, user_id: string) {
  const [p, t] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user_id).maybeSingle<Profile>(),
    supabase.from('transactions').select('*').eq('user_id', user_id).returns<Transaction[]>(),
  ])
  return { profile: p.data, transactions: t.data ?? [], error: p.error ?? t.error }
}
