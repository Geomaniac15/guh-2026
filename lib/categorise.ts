import type { SupabaseClient } from '@supabase/supabase-js'
import { CATEGORY_GROUP } from '@/lib/runway'

export type Categorised = { category: string; source: 'rule' | 'map' | 'ai' | 'fallback' }

const CATEGORIES = Object.keys(CATEGORY_GROUP)

// 'Nandos  Manchester ' -> 'NANDOS MANCHESTER'. Rules are stored under this key.
export const normaliseMerchant = (raw: string) => raw.toUpperCase().replace(/\s+/g, ' ').trim().slice(0, 80)

// Common UK merchants. Substring match on the normalised name; first hit wins.
const MERCHANT_MAP: [string, string][] = [
  ['UBER EATS', 'takeaways'],
  ['UBER', 'transport'],
  ['TESCO', 'food'],
  ['SAINSBURY', 'food'],
  ['ALDI', 'food'],
  ['LIDL', 'food'],
  ['ASDA', 'food'],
  ['CO-OP', 'food'],
  ['DELIVEROO', 'takeaways'],
  ['JUST EAT', 'takeaways'],
  ['GREGGS', 'takeaways'],
  ['WETHERSPOON', 'going_out'],
  ['STAGECOACH', 'transport'],
  ['TRAINLINE', 'transport'],
  ['PRIMARK', 'shopping'],
  ['ASOS', 'shopping'],
  ['AMAZON', 'shopping'],
  ['SPOTIFY', 'bills'],
  ['NETFLIX', 'bills'],
]

const PROMPT = `You categorise UK card transactions for a university student. Reply with one category.
food: supermarkets and grocery shops (Tesco, Aldi, Co-op)
takeaways: food delivery, fast food, coffee and snacks to go (Deliveroo, Greggs, Starbucks)
going_out: pubs, bars, clubs, restaurants, cinema, gigs (Spoons, Nandos)
transport: buses, trains, taxis, ride hailing (Uber trips, Stagecoach)
course: textbooks, printing, stationery, university fees
bills: rent, energy, phone, internet, subscriptions (Spotify, Netflix)
shopping: clothes, online shopping, electronics (Primark, ASOS, Amazon)
other: anything else`

// Qwen via a local Ollama. The JSON schema enum forces a valid category.
// shortcut: Ollama runs on a laptop, so the Vercel deploy can't reach it and falls back to 'other'. Upgrade: hosted model.
async function askQwen(merchant: string): Promise<string | null> {
  try {
    const res = await fetch(`${process.env.OLLAMA_URL ?? 'http://localhost:11434'}/api/chat`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL ?? 'qwen2.5:1.5b',
        stream: false,
        options: { temperature: 0 },
        format: { type: 'object', properties: { category: { type: 'string', enum: CATEGORIES } }, required: ['category'] },
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: merchant },
        ],
      }),
    })
    if (!res.ok) return null
    const category = JSON.parse((await res.json()).message?.content ?? '{}').category
    return CATEGORIES.includes(category) ? category : null
  } catch {
    return null // Ollama not running, timed out, or bad JSON
  }
}

// Your corrections first, then the hardcoded map, then Qwen, then 'other'
export async function categorise(supabase: SupabaseClient, user_id: string, rawMerchant: string): Promise<Categorised> {
  const merchant = normaliseMerchant(rawMerchant)

  const { data: rule } = await supabase
    .from('user_merchant_rules')
    .select('category')
    .eq('user_id', user_id)
    .eq('merchant', merchant)
    .maybeSingle<{ category: string }>()
  if (rule && CATEGORIES.includes(rule.category)) return { category: rule.category, source: 'rule' }

  const hit = MERCHANT_MAP.find(([pattern]) => merchant.includes(pattern))
  if (hit) return { category: hit[1], source: 'map' }

  const ai = await askQwen(merchant)
  if (ai) return { category: ai, source: 'ai' }
  return { category: 'other', source: 'fallback' }
}
