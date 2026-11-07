import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AskClaude from '@/components/AskClaude'
import LoadDemoButton from '@/components/LoadDemoButton'

export default function DashboardPage() {
  return (
    <main className='mx-auto w-full max-w-2xl flex-1 space-y-6 p-6'>
      <h1 className='text-3xl font-semibold'>Dashboard</h1>
      <Suspense fallback={<p className='text-zinc-600'>Loading...</p>}>
        <UserInfo />
      </Suspense>
      <LoadDemoButton />
      <AskClaude />
    </main>
  )
}

// Reads the logged-in user. Anything that reads cookies or fetches
// per-user data must sit inside <Suspense> in this version of Next.js.
async function UserInfo() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect('/login')
  return <p className='text-zinc-600'>Logged in as {String(data.claims.email)}</p>
}
