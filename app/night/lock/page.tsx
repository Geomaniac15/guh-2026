import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadActiveNight, nightFuel } from '@/lib/data'
import FuelGauge from '@/components/FuelGauge'
import LockClock from '@/components/LockClock'
import AutoRefresh from '@/components/AutoRefresh'

// Fake iPhone lock screen with a tiny fuel gauge pill. No numbers, ever.
export default function NightLockPage() {
  return (
    <main className='fixed inset-0 z-50 bg-[#1C2030] text-foreground'>
      <div className='mx-auto flex h-full w-full max-w-[420px] flex-col items-center px-6 pb-10 pt-16'>
        <LockClock />
        <Suspense fallback={<div className='mt-6 h-[52px]' />}>
          <GaugePill />
        </Suspense>
        <AutoRefresh seconds={5} />
        <div className='mt-auto flex w-full justify-between px-4'>
          <span className='size-14 rounded-full bg-white/10' />
          {/* Tap the camera spot to get back to the app during the demo */}
          <Link href='/night' aria-label='Back to night out' className='size-14 rounded-full bg-white/10' />
        </div>
      </div>
    </main>
  )
}

async function GaugePill() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) redirect('/login')
  const { night } = await loadActiveNight(supabase, auth.claims.sub)
  if (!night || !night.show_on_lock) return <div className='mt-6 h-[52px]' />

  return (
    <div className='mt-6 flex items-center gap-3 rounded-2xl bg-black/40 px-4 py-2 backdrop-blur'>
      <FuelGauge fill={nightFuel(night)} size={64} labels={false} />
      <span className='flex items-center gap-1.5 text-sm font-semibold'>
        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden>
          <path d='M3 12h4l3-7 4 14 3-7h4' />
        </svg>
        Night out
      </span>
    </div>
  )
}
