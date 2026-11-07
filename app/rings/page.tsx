import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadRunway } from '@/lib/data'
import GaugesEditor from '@/components/GaugesEditor'
import LoadDemoButton from '@/components/LoadDemoButton'

export default function GaugesPage() {
  return (
    <main className='mx-auto flex page-min-h w-full max-w-[420px] flex-col gap-5 px-5 py-6'>
      <header>
        <p className='text-sm text-muted'>Settings</p>
        <h1 className='font-display text-4xl font-bold'>Your gauges</h1>
      </header>
      <Suspense fallback={<GaugesSkeleton />}>
        <Editor />
      </Suspense>
    </main>
  )
}

// Reads per-user data, so it must sit inside <Suspense>
async function Editor() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) redirect('/login')

  const { profile, transactions, error } = await loadRunway(supabase, auth.claims.sub)
  if (error) return <p className='rounded-2xl bg-card p-5 text-pink'>Could not load your gauges: {error.message}</p>
  if (!profile) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-4 text-center'>
        <p className='text-muted'>No money set up yet.</p>
        <LoadDemoButton />
      </div>
    )
  }
  return <GaugesEditor profile={profile} transactions={transactions} now={new Date().getTime()} />
}

function GaugesSkeleton() {
  return (
    <div className='flex animate-pulse flex-col gap-5'>
      <div className='h-12 rounded-2xl bg-card' />
      <div className='h-40 rounded-2xl bg-card' />
      <div className='h-20 rounded-2xl bg-card' />
      <div className='h-20 rounded-2xl bg-card' />
      <div className='h-20 rounded-2xl bg-card' />
    </div>
  )
}
