import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CATEGORY_LABELS, gbp, summary, transactionImpact, type Profile } from '@/lib/runway'
import { loadRunway } from '@/lib/data'
import Rings from '@/components/Rings'
import MoodChip from '@/components/MoodChip'
import Timeline from '@/components/Timeline'
import LoadDemoButton from '@/components/LoadDemoButton'
import Flame from '@/components/Flame'
import BudgetCard from '@/components/BudgetCard'
import LockGate from '@/components/LockGate'
import DashboardMenu from '@/components/DashboardMenu'
import TransactionList, { type TxRow } from '@/components/TransactionList'
import BankFeed from '@/components/BankFeed'

export default function DashboardPage() {
  return (
    <main className='mx-auto flex page-min-h w-full max-w-[420px] flex-col px-5 py-6'>
      {/* Opened fresh? Show the Face ID lock first */}
      <LockGate fallback={<TodaySkeleton />}>
        <Suspense fallback={<TodaySkeleton />}>
          <Today />
        </Suspense>
      </LockGate>
    </main>
  )
}

// Reads per-user data, so it must sit inside <Suspense>
async function Today() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) redirect('/login')
  const { profile, transactions, error } = await loadRunway(supabase, auth.claims.sub)

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
  const s = summary(profile, transactions, now)
  const date = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className='flex flex-1 flex-col gap-5'>
      <header className='flex items-end justify-between'>
        <div>
          <p className='text-sm text-muted'>{date}</p>
          <h1 className='font-display text-4xl font-bold'>Runway</h1>
        </div>
        <div className='flex items-center gap-2'>
          <MoodChip mood={s.mood} />
          <DashboardMenu />
        </div>
      </header>

      <section className='flex items-center gap-5'>
        <Link href='/rings' aria-label='Customise your rings'>
          <Rings progress={s.progress} size={150} />
        </Link>
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

      <BudgetCard b={s.budget} pot={Number(profile.pot)} />

      <p className='flex items-center gap-2 text-sm text-muted'>
        <Flame />
        {profile.streak}-day streak · amounts hidden on widgets
      </p>

      <BankFeed connected={!!profile.bank_connected_at} />
      <TransactionList rows={latest(profile, transactions, now)} />
    </div>
  )
}

// Latest 10 for the list, with display text worked out on the server (UK time)
function latest(profile: Profile, transactions: Awaited<ReturnType<typeof loadRunway>>['transactions'], now: Date): TxRow[] {
  const uk = { timeZone: 'Europe/London' } as const
  const today = now.toLocaleDateString('en-GB', uk)
  return [...transactions]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 10)
    .map((t) => {
      const at = new Date(t.created_at)
      return {
        id: t.id!,
        kind: t.kind,
        amount: Number(t.amount),
        category: t.category,
        name: t.merchant || t.note || CATEGORY_LABELS[t.category ?? ''] || 'Transaction',
        when:
          at.toLocaleDateString('en-GB', uk) === today
            ? `Today ${at.toLocaleTimeString('en-GB', { ...uk, hour: '2-digit', minute: '2-digit' })}`
            : at.toLocaleDateString('en-GB', { ...uk, weekday: 'short', day: 'numeric', month: 'short' }),
        fullWhen: at.toLocaleString('en-GB', { ...uk, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
        source: t.source === 'bank' ? 'bank' : 'manual',
        ai: !!t.ai_categorised,
        impact: transactionImpact(t, profile, transactions, now),
      }
    })
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
