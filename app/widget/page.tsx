import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadRunway } from '@/lib/data'
import { summary } from '@/lib/runway'
import GaugeCluster from '@/components/GaugeCluster'
import GaugeTile from '@/components/GaugeTile'
import JerryCan from '@/components/JerryCan'
import RangeWidget from '@/components/RangeWidget'
import LoanRoad from '@/components/LoanRoad'
import LoadDemoButton from '@/components/LoadDemoButton'

// Widget gallery: five small widgets plus the combined medium and large. Gauges and days only, never pounds.
export default function WidgetPage() {
  return (
    <main className='mx-auto w-full max-w-[420px] flex-1 px-4 py-6'>
      <Suspense fallback={<div className='h-[600px] animate-pulse rounded-[22px] bg-card' />}>
        <Widgets />
      </Suspense>
    </main>
  )
}

async function Widgets() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) redirect('/login')

  const { profile, transactions, error } = await loadRunway(supabase, auth.claims.sub)
  if (error || !profile) {
    return (
      <div className='space-y-4 rounded-[22px] bg-card p-5 text-center'>
        <p className='text-muted'>{error ? 'Could not load your gauges.' : 'No data yet.'}</p>
        <div className='flex justify-center'>
          <LoadDemoButton />
        </div>
      </div>
    )
  }

  const now = new Date().getTime()
  const s = summary(profile, transactions)
  const g = s.gauges
  const savings = Math.round(g.savings.fill * 100)

  return (
    <div className='space-y-8'>
      <section className='space-y-3'>
        <h2 className='text-xs font-semibold uppercase tracking-wider text-muted'>Range to loan day</h2>
        <div className='grid grid-cols-2 gap-3'>
          <Link href='/dashboard'>
            <RangeWidget size='small' runway={s.runway} untilLoan={s.untilLoan} now={now} />
          </Link>
        </div>
        <Link href='/dashboard' className='block'>
          <RangeWidget size='medium' runway={s.runway} untilLoan={s.untilLoan} now={now} />
        </Link>
        <Link href='/dashboard' className='block'>
          <RangeWidget size='large' runway={s.runway} untilLoan={s.untilLoan} now={now} />
        </Link>
        <p className='text-xs text-muted'>
          Grey road is the time until loan day. The road block is where your fuel runs out at your usual pace; the
          dimmed road past it is the stretch you can&apos;t reach yet. The car only moves with the calendar: spending
          moves the block closer, saving and shifts push it further away.
        </p>
      </section>

      <section className='space-y-3'>
        <h2 className='text-xs font-semibold uppercase tracking-wider text-muted'>Gauges</h2>
        <div className='grid grid-cols-2 gap-3'>
          <Link href='/dashboard'>
            <GaugeTile name='Needs' reading={g.needs} colour='#4DA3FF' />
          </Link>
          <Link href='/dashboard'>
            <GaugeTile name='Wants' reading={g.wants} colour='#FF8A3D' />
          </Link>
          <Link href='/dashboard'>
            <GaugeTile name={g.category.label} reading={g.category} colour='#FF6B8A' caption={`Your ${g.category.label.toLowerCase()} gauge`} />
          </Link>
          <Link href='/dashboard' className='flex aspect-square flex-col rounded-[22px] bg-card p-4'>
            <span className='flex items-center justify-between text-sm'>
              <span className='font-semibold'>Savings</span>
              <span className='text-muted'>{savings}%</span>
            </span>
            <span className='flex flex-1 items-center justify-center'>
              <JerryCan fill={g.savings.fill} size={78} />
            </span>
            <span className='text-center text-xs text-muted'>Fills as you save</span>
          </Link>
        </div>
        <p className='text-center text-sm text-muted'>Tap any widget to open Odo</p>
      </section>

      <section className='space-y-3'>
        <h2 className='text-xs font-semibold uppercase tracking-wider text-muted'>Combined · medium</h2>
        <Link href='/dashboard' className='block rounded-[22px] bg-card px-4 pb-4 pt-5'>
          <GaugeCluster g={g} compact />
        </Link>
      </section>

      <section className='space-y-3'>
        <h2 className='text-xs font-semibold uppercase tracking-wider text-muted'>Combined · large</h2>
        <Link href='/dashboard' className='block divide-y divide-line overflow-hidden rounded-[22px] bg-card'>
          <div className='space-y-2 p-4'>
            <div className='flex items-baseline justify-between'>
              <span className='font-semibold'>Range</span>
              <span className='text-xs text-muted'>
                {Math.round(s.runway)} days of range · {s.untilLoan} days to loan
              </span>
            </div>
            <LoanRoad reach={s.untilLoan > 0 ? s.runway / s.untilLoan : 1} />
          </div>
          <div className='px-4 pb-4 pt-5'>
            <GaugeCluster g={g} />
          </div>
          <div className='flex items-center gap-4 p-4'>
            <JerryCan fill={g.savings.fill} size={52} />
            <div className='flex-1 space-y-1'>
              <div className='flex justify-between text-sm'>
                <span className='font-semibold'>Savings</span>
                <span className='font-bold'>{savings}%</span>
              </div>
              <div className='h-2 overflow-hidden rounded-full bg-line'>
                <div className='h-full rounded-full bg-lime' style={{ width: `${savings}%` }} />
              </div>
              <p className='text-xs text-muted'>of this week&apos;s goal · fills when you save or underspend</p>
            </div>
          </div>
          <p className='p-3 text-center text-xs text-muted'>Tap to see pounds in the app</p>
        </Link>
      </section>

      <section className='space-y-2 rounded-[22px] bg-card p-4'>
        <h2 className='text-xs font-semibold uppercase tracking-wider text-muted'>Why a total gauge</h2>
        <p className='text-sm'>
          Total is Needs and Wants in one tank. It can read on pace while the Wants gauge is behind, because Needs is
          ahead. The triangle on each dial points to where you should be today.
        </p>
      </section>
    </div>
  )
}
