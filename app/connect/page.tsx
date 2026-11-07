import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConnectButton from '@/components/ConnectButton'

export default function ConnectPage() {
  return (
    <main className='page-min-h mx-auto flex w-full max-w-[420px] flex-col gap-5 px-5 py-6'>
      <header>
        <p className='text-sm text-muted'>Bank feed</p>
        <h1 className='font-display text-4xl font-bold'>Bank</h1>
      </header>
      <Suspense fallback={<div className='h-40 animate-pulse rounded-2xl bg-card' />}>
        <BankStatus />
      </Suspense>
    </main>
  )
}

// Reads the profile, so it must sit inside <Suspense>
async function BankStatus() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) redirect('/login')
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('bank_connected_at')
    .eq('user_id', auth.claims.sub)
    .maybeSingle()
  if (error) return <p className='rounded-2xl bg-card p-5 text-pink'>Could not load your bank: {error.message}</p>

  const since = profile?.bank_connected_at
    ? new Date(profile.bank_connected_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' })
    : null

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='space-y-3 rounded-2xl bg-card p-5'>
        <div className='flex items-center gap-3'>
          <span className='flex size-11 items-center justify-center rounded-xl bg-blue/15 text-blue'>
            <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden>
              <path d='M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18' />
            </svg>
          </span>
          <div>
            <p className='font-semibold'>{since ? 'Connected to Demo Bank' : 'Demo Bank'}</p>
            <p className='text-sm text-muted'>{since ? `Syncing since ${since}` : 'Not connected'}</p>
          </div>
        </div>
        <p className='text-sm text-muted'>
          Odo reads your bank feed and sorts each payment into a category, so you never log a spend by hand. Fix a
          category once and it remembers that shop.
        </p>
        <ConnectButton connected={!!since} />
      </div>

      <Link href='/connect/simulate' className='rounded-2xl border border-line bg-card p-4 text-center font-semibold'>
        Simulate a bank transaction
      </Link>
    </div>
  )
}
