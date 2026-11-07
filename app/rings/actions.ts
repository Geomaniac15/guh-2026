'use server'

import { refresh } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CATEGORY_LIMITS } from '@/lib/runway'

// Saves which category the 4th gauge tracks and its weekly limit
export async function saveGauge(category: string, limit: number) {
  if (!Object.hasOwn(CATEGORY_LIMITS, category)) return { error: 'Pick a category' }
  limit = Math.round(Number(limit) * 100) / 100
  if (!Number.isFinite(limit) || limit < 1 || limit > 1000) return { error: 'Set a weekly limit between £1 and £1,000' }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) return { error: 'Not logged in' }

  const { error } = await supabase
    .from('profiles')
    .update({ gauge_category: category, gauge_limit: limit })
    .eq('user_id', auth.claims.sub)
  if (error) return { error: error.message }
  refresh()
  return { ok: true }
}
