import { NextResponse } from 'next/server'
import { ask } from '@/lib/ai'
import { createClient } from '@/lib/supabase/server'

// POST /api/test  { prompt: string }  ->  { reply: string }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  try {
    const { prompt } = await request.json()
    const reply = await ask(prompt || 'Say hello in five words')
    return NextResponse.json({ reply })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Claude call failed. Check ANTHROPIC_API_KEY.' }, { status: 500 })
  }
}
