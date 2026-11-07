import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadActiveNight, loadRunway, nightFuel } from '@/lib/data'
import { summary } from '@/lib/runway'
import Gauge from '@/components/Gauge'
import RangeRoad from '@/components/RangeRoad'
import LockClock from '@/components/LockClock'
import AutoRefresh from '@/components/AutoRefresh'

// Road trip lock screen: clock, fuel and range, tonight's gauge. Gauges only, never pounds.
export default function NightLockPage() {
  return (
    <main className='fixed inset-0 z-50 overflow-hidden bg-[#07080B] text-foreground'>
      <Road />
      <div className='relative mx-auto flex h-full w-full max-w-[420px] flex-col items-center px-5 pb-8 pt-14'>
        <LockClock />
        <Suspense fallback={<div className='mt-6 h-[88px]' />}>
          <LockWidgets />
        </Suspense>
        <AutoRefresh seconds={5} />
        <Link href='/locked' className='mt-4 text-center text-sm font-medium text-white/80'>
          Gauges only, no amounts. Tap to unlock and see figures.
        </Link>
      </div>
    </main>
  )
}

async function LockWidgets() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) redirect('/login')
  const [{ profile, transactions }, { night }] = await Promise.all([
    loadRunway(supabase, auth.claims.sub),
    loadActiveNight(supabase, auth.claims.sub),
  ])
  const s = profile ? summary(profile, transactions) : null

  return (
    <>
      {s && (
        <div className='mt-6 flex w-full items-center justify-center gap-3'>
          <span className='flex size-[88px] shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur'>
            <Gauge fill={s.gauges.total.fill} pace={s.gauges.pace} size={66} labels={false} label='Fuel left this week' />
          </span>
          <span className='w-[210px] rounded-[26px] bg-white/10 px-4 py-3 backdrop-blur'>
            <span className='flex justify-between text-sm font-semibold'>
              <span>Range</span>
              <span>{s.mood}</span>
            </span>
            <RangeRoad runway={s.runway} untilLoan={s.untilLoan} colour='#F4F5F7' />
          </span>
        </div>
      )}

      {/* Pushes the night out card down onto the road */}
      <div className='flex-1' />

      {night?.show_on_lock && (
        <div className='flex w-full items-center gap-3 rounded-[26px] bg-[#1A1D24]/95 p-4 backdrop-blur'>
          <Gauge fill={nightFuel(night)} colour={nightFuel(night) > 0.25 ? '#B8F25C' : '#FF6B8A'} size={80} labels={false} label="Tonight's fuel" />
          <span className='min-w-0 flex-1'>
            <span className='block text-lg font-bold'>Night out</span>
            <span className='block text-sm text-white/80'>
              Fuel for tonight{Number(night.taxi_reserve) > 0 && ' · taxi home kept aside'}
            </span>
          </span>
          <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden>
            <rect x='5' y='11' width='14' height='10' rx='2' />
            <path d='M8 11V7a4 4 0 0 1 8 0v4' />
          </svg>
        </div>
      )}
    </>
  )
}

// Perspective road running down the lower half of the screen
function Road() {
  return (
    <svg className='absolute inset-x-0 bottom-0 h-[58%] w-full' viewBox='0 0 400 500' preserveAspectRatio='none' aria-hidden>
      <path d='M170 0 H230 L400 500 H0 Z' fill='#16181E' />
      <path d='M170 0 L0 500 M230 0 L400 500' stroke='#2A2E38' strokeWidth='3' />
      {[0, 1, 2, 3].map((i) => {
        const y = 30 + i * 120
        const w = 3 + i * 5
        return <path key={i} d={`M${200 - w / 2} ${y} H${200 + w / 2} L${200 + w} ${y + 55 + i * 12} H${200 - w} Z`} fill='#3A3F4B' />
      })}
    </svg>
  )
}
