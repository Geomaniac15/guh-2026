import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadRunway } from '@/lib/data'
import { summary } from '@/lib/runway'
import Gauge from '@/components/Gauge'
import MoodChip from '@/components/MoodChip'
import FaceIdUnlock from '@/components/FaceIdUnlock'

// App lock screen: rings and mood only, amounts hidden until unlock
export default function LockedPage() {
  return (
    <main className='mx-auto flex page-min-h w-full max-w-[420px] flex-col items-center px-6 pb-10 pt-16 text-center'>
      <Suspense fallback={<div className='size-[170px] animate-pulse rounded-full bg-card' />}>
        <LockedStatus />
      </Suspense>
      <h1 className='mt-8 font-display text-4xl font-bold'>Runway is locked</h1>
      <p className='mt-4 text-muted'>Your amounts, transactions and league are hidden until you unlock.</p>

      <svg className='mt-auto' width='84' height='84' viewBox='0 0 64 64' fill='none' stroke='#F4F5F7' strokeWidth='3' strokeLinecap='round' aria-hidden>
        <path d='M6 20V12a6 6 0 0 1 6-6h8M44 6h8a6 6 0 0 1 6 6v8M58 44v8a6 6 0 0 1-6 6h-8M20 58h-8a6 6 0 0 1-6-6v-8' />
        <path d='M22 24v5M42 24v5M32 24v12h-3M23 44c5 4 13 4 18 0' />
      </svg>
      <Suspense fallback={<div className='mt-6 h-14 w-full animate-pulse rounded-2xl bg-card' />}>
        <Unlock />
      </Suspense>
    </main>
  )
}

// Total fuel gauge + mood chip for the signed-in user (reads cookies, so it sits in <Suspense>)
async function LockedStatus() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) redirect('/login')
  const { profile, transactions } = await loadRunway(supabase, auth.claims.sub)
  const s = profile ? summary(profile, transactions) : null
  return (
    <div className='flex flex-col items-center gap-6'>
      <Gauge fill={s?.gauges.total.fill ?? 0} pace={s?.gauges.pace} size={190} label='Fuel left this week' />
      {s && <MoodChip mood={s.mood} label={`${s.mood} today`} />}
    </div>
  )
}

// Face ID needs the user id to tie the credential to this account
async function Unlock() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) redirect('/login')
  return <FaceIdUnlock userId={auth.claims.sub} />
}
