import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadActiveNight, loadRunway, nightFuel } from '@/lib/data'
import { avgDailySpend } from '@/lib/runway'
import NightSetup from '@/components/NightSetup'
import NightActive from '@/components/NightActive'
import LoadDemoButton from '@/components/LoadDemoButton'

export default function NightPage() {
  return (
    <main className='mx-auto flex min-h-[calc(100dvh-49px)] w-full max-w-[420px] flex-col px-5 py-6'>
      <Suspense fallback={<NightSkeleton />}>
        <Night />
      </Suspense>
    </main>
  )
}

// Reads per-user data, so it must sit inside <Suspense>
async function Night() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) redirect('/login')
  const user_id = auth.claims.sub

  const [{ profile, transactions, error }, { night, error: nightError }] = await Promise.all([
    loadRunway(supabase, user_id),
    loadActiveNight(supabase, user_id),
  ])
  if (error || nightError) {
    return (
      <div className='space-y-2 rounded-2xl bg-card p-5'>
        <p className='font-semibold text-pink'>Could not load night out mode</p>
        <p className='text-sm text-muted'>{(error ?? nightError)?.message}</p>
      </div>
    )
  }
  if (!profile) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-4 text-center'>
        <p className='text-muted'>No money set up yet.</p>
        <LoadDemoButton />
      </div>
    )
  }

  const now = new Date()
  const when = night ? new Date(night.started_at) : now
  const stamp = `${when.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London' })} · ${when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })}`

  return (
    <div className='flex flex-1 flex-col gap-5'>
      <header>
        <p className='text-sm text-muted'>{night ? `Started ${stamp}` : stamp}</p>
        <h1 className='font-display text-4xl font-bold'>Night out mode</h1>
      </header>
      {night ? (
        <NightActive night={night} fill={nightFuel(night)} />
      ) : (
        <NightSetup avgDaily={avgDailySpend(transactions, now)} />
      )}
    </div>
  )
}

function NightSkeleton() {
  return (
    <div className='flex animate-pulse flex-col gap-5'>
      <div className='h-14 w-52 rounded-2xl bg-card' />
      <div className='h-72 rounded-2xl bg-card' />
      <div className='h-12 rounded-2xl bg-card' />
      <div className='h-20 rounded-2xl bg-card' />
    </div>
  )
}
