import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /demo: one-tap entry for judges (the QR code points here). Signs in as the shared demo account
// and opens the app, which shows the Face ID lock first ("Use passcode" skips it).
// shortcut: anyone with this link gets into the demo account. Fine for a hackathon (no real data);
// delete this route or unset DEMO_PASSWORD afterwards.
export async function GET(request: Request) {
  const email = process.env.DEMO_EMAIL
  const password = process.env.DEMO_PASSWORD
  if (!email || !password) return NextResponse.redirect(new URL('/login', request.url))

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.error('Demo login failed', error)
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
