'use server'

import { refresh } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { categorise } from '@/lib/categorise'
import { recordTransaction } from '@/lib/record'

type FeedItem = { merchant: string; amount: number; kind: 'shift' | 'spend' }

// Demo Bank incoming transactions. Shifts come in as payroll credits.
const FEED: Record<string, FeedItem> = {
  payroll: { merchant: 'SU BAR PAYROLL', amount: 48, kind: 'shift' },
  nandos: { merchant: 'NANDOS MANCHESTER', amount: 15, kind: 'spend' },
  tesco: { merchant: 'TESCO STORES 2041', amount: 6.4, kind: 'spend' },
  uber: { merchant: 'UBER *TRIP', amount: 9.2, kind: 'spend' },
  costa: { merchant: 'COSTA COFFEE OXFORD RD', amount: 3.4, kind: 'spend' },
  deliveroo: { merchant: 'DELIVEROO.CO.UK', amount: 18.9, kind: 'spend' },
  waterstones: { merchant: 'WATERSTONES DEANSGATE', amount: 9.99, kind: 'spend' },
  greggs: { merchant: 'GREGGS 1182', amount: 2.85, kind: 'spend' },
  sainsburys: { merchant: 'SAINSBURYS S/MKT', amount: 12.3, kind: 'spend' },
  spoons: { merchant: 'JD WETHERSPOON SEVEN STARS', amount: 8.6, kind: 'spend' },
}

// Order the live feed plays in, then loops. Mixes AI (Costa, Waterstones, Nandos) with known merchants.
const QUEUE = ['nandos', 'tesco', 'costa', 'uber', 'payroll', 'deliveroo', 'waterstones', 'greggs', 'sainsburys', 'spoons']
const MIN_GAP_MS = 15000 // at most one live transaction per 15s, even with several tabs open

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

export type Synced = { merchant: string; amount: number; kind: 'shift' | 'spend'; category?: string; ai: boolean; impact: string }

// Categorises one Demo Bank transaction and records it with the normal logic
async function pushFeedItem(supabase: Awaited<ReturnType<typeof createClient>>, user_id: string, item: FeedItem) {
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
  const impact =
    item.kind === 'shift' ? `+${res.days.toFixed(1)} days` : res.covered ? 'Covered by essentials' : `−${res.days.toFixed(1)} days`
  return { merchant: item.merchant, amount: res.amount, kind: item.kind, category: cat?.category, ai: cat?.source === 'ai', impact }
}

// Simulator button: push one specific transaction now
export async function simulateBankTransaction(id: string): Promise<Synced | { error: string }> {
  const item = Object.hasOwn(FEED, id) ? FEED[id] : null
  if (!item) return { error: 'Unknown transaction' }
  const { supabase, user_id } = await user()
  if (!user_id) return { error: 'Not logged in' }
  const res = await pushFeedItem(supabase, user_id, item)
  if (!('error' in res)) refresh()
  return res
}

// Live feed: called by the dashboard every ~20s. Sends the next queued transaction if the bank is connected.
export async function syncBank(): Promise<Synced | { skipped: string } | { error: string }> {
  const { supabase, user_id } = await user()
  if (!user_id) return { error: 'Not logged in' }

  const [{ data: profile }, { data: last, count }] = await Promise.all([
    supabase.from('profiles').select('bank_connected_at').eq('user_id', user_id).maybeSingle(),
    supabase
      .from('transactions')
      .select('created_at', { count: 'exact' })
      .eq('user_id', user_id)
      .eq('source', 'bank')
      .order('created_at', { ascending: false })
      .limit(1),
  ])
  if (!profile?.bank_connected_at) return { skipped: 'Bank not connected' }
  if (last?.[0] && Date.now() - new Date(last[0].created_at).getTime() < MIN_GAP_MS) return { skipped: 'Too soon' }

  const res = await pushFeedItem(supabase, user_id, FEED[QUEUE[(count ?? 0) % QUEUE.length]])
  if (!('error' in res)) refresh()
  return res
}
