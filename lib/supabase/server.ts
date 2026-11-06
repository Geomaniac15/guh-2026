import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { connection } from 'next/server'

// Supabase client for server components, route handlers and server actions
export async function createClient() {
  // Mark this as request-time work. Supabase checks token expiry with Date.now(),
  // which Next.js 16 refuses to run while prerendering.
  await connection()
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a server component: safe to ignore, proxy.ts refreshes sessions
          }
        },
      },
    }
  )
}
