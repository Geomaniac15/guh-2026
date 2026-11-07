import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { gbp, summary, type Profile, type Transaction } from '@/lib/runway'
import Rings from '@/components/Rings'
import MoodChip from '@/components/MoodChip'
import Timeline from '@/components/Timeline'
import AddActions from '@/components/AddActions'
import LoadDemoButton from '@/components/LoadDemoButton'

export default function DashboardPage() {
  return (
    <main className='mx-auto flex min-h-[calc(100dvh-49px)] w-full max-w-[420px] flex-col px-5 py-6'>
      <Suspense fallback={<TodaySkeleton />}>
        <Today />
      </Suspense>
    </main>
  )
}

// Reads per-user data, so it must sit inside <Suspense>
async function Today() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) redirect('/login')
  const user_id = auth.claims.sub

  const [{ data: profile, error }, { data: txs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user_id).maybeSingle<Profile>(),
    supabase.from('transactions').select('*').eq('user_id', user_id).returns<Transaction[]>(),
  ])

  if (error) {
    return (
      <div className='space-y-4 rounded-2xl bg-card p-5'>
        <p className='font-semibold text-pink'>Could not load your runway</p>
        <p className='text-sm text-muted'>{error.message}. Has supabase/schema.sql been run?</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className='flex flex-1 flex-col justify-center gap-4 text-center'>
        <h1 className='font-display text-4xl font-bold'>Runway</h1>
        <p className='text-muted'>No money set up yet. Load the demo student to see how it works.</p>
        <div className='mx-auto'>
          <LoadDemoButton />
        </div>
      </div>
    )
  }

  const now = new Date()
  const s = summary(profile, txs ?? [], now)
  const date = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className='flex flex-1 flex-col gap-5'>
      <header className='flex items-end justify-between'>
        <div>
          <p className='text-sm text-muted'>{date}</p>
          <h1 className='font-display text-4xl font-bold'>Runway</h1>
        </div>
        <MoodChip mood={s.mood} />
      </header>

      <section className='flex items-center gap-5'>
        <Rings progress={s.progress} size={150} />
        <div>
          <p className='font-display text-7xl font-bold leading-none'>{Math.round(s.runway)}</p>
          <p className='mt-1 font-medium'>days of runway</p>
          <p className='text-sm text-muted'>Next loan in {s.untilLoan} days</p>
        </div>
      </section>

      <Timeline runway={s.runway} untilLoan={s.untilLoan} now={now.getTime()} />

      <div className='grid grid-cols-2 gap-3'>
        <Stat label="Today's allowance" value={gbp(s.allowance)} />
        <Stat label='Left today' value={gbp(s.leftToday)} warn={s.leftToday === 0} />
      </div>

      <p className='flex items-center gap-2 text-sm text-muted'>
        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#FF8A3D' strokeWidth='2.2' strokeLinejoin='round' aria-hidden>
          <path d='M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 1.5 1 2 2 2.5 3.5C12.5 8 12 5.5 12 3z' />
        </svg>
        {profile.streak}-day streak · amounts hidden on widgets
      </p>

      <div className='mt-auto space-y-4 pt-4'>
        <AddActions />
        <div className='flex justify-center opacity-60'>
          <LoadDemoButton />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className='rounded-2xl bg-card p-4'>
      <p className='text-sm text-muted'>{label}</p>
      <p className={`font-display text-2xl font-bold ${warn ? 'text-pink' : ''}`}>{value}</p>
    </div>
  )
}

function TodaySkeleton() {
  return (
    <div className='flex animate-pulse flex-col gap-5'>
      <div className='h-14 w-40 rounded-2xl bg-card' />
      <div className='flex items-center gap-5'>
        <div className='size-[150px] rounded-full bg-card' />
        <div className='h-20 w-32 rounded-2xl bg-card' />
      </div>
      <div className='h-24 rounded-2xl bg-card' />
      <div className='grid grid-cols-2 gap-3'>
        <div className='h-20 rounded-2xl bg-card' />
        <div className='h-20 rounded-2xl bg-card' />
      </div>
    </div>
  )
}
