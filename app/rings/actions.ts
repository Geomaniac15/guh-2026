'use server'

import { refresh } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ringFromChoice, type Ring } from '@/lib/runway'

type Input = {
  mode: string
  ringIds: string[]
  split: { needs: number; wants: number; savings: number }
}

// Saves ring mode, custom rings (rebuilt from ids on the server) and the Basic split
export async function saveRings({ mode, ringIds, split }: Input) {
  if (!['runway', 'basic', 'custom'].includes(mode)) return { error: 'Unknown ring mode' }

  const pcts = [split.needs, split.wants, split.savings]
  if (!pcts.every((p) => Number.isInteger(p) && p >= 0 && p <= 100) || pcts[0] + pcts[1] + pcts[2] !== 100) {
    return { error: 'The split must add up to 100%' }
  }
  const rings = ringIds.map(ringFromChoice)
  if (rings.length !== 3 || rings.some((r) => !r)) return { error: 'Pick three rings' }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) return { error: 'Not logged in' }

  const { error } = await supabase
    .from('profiles')
    .update({
      ring_mode: mode,
      rings: rings as Ring[],
      needs_pct: split.needs,
      wants_pct: split.wants,
      savings_pct: split.savings,
    })
    .eq('user_id', auth.claims.sub)
  if (error) return { error: error.message }
  refresh()
  return { ok: true }
}
