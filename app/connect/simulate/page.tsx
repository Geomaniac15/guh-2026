import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SimulateBank from '@/components/SimulateBank'

export default function SimulatePage() {
  return (
    <main className='page-min-h mx-auto flex w-full max-w-[420px] flex-col gap-5 px-5 py-6'>
      <header>
        <p className='text-sm text-muted'>Demo Bank</p>
        <h1 className='font-display text-4xl font-bold'>Simulate a transaction</h1>
      </header>
      <Suspense fallback={<div className='h-64 animate-pulse rounded-2xl bg-card' />}>
        <LoggedIn />
      </Suspense>
    </main>
  )
}

async function LoggedIn() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect('/login')
  return <SimulateBank />
}
