'use client'

import { useLayoutEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { simulateBankTransaction, type Synced } from '@/app/connect/actions'
import SyncedToast from '@/components/SyncedToast'

const ITEMS = [
  { id: 'payroll', merchant: 'SU BAR PAYROLL', amount: '+£48.00', credit: true },
  { id: 'nandos', merchant: 'NANDOS MANCHESTER', amount: '£15.00' },
  { id: 'tesco', merchant: 'TESCO STORES 2041', amount: '£6.40' },
  { id: 'uber', merchant: 'UBER *TRIP', amount: '£9.20' },
]

// Manual override for the live feed: push one Demo Bank transaction now. It syncs like any other, no result screen.
export default function SimulateBank() {
  const [last, setLast] = useState<Synced | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  // Next keeps this page alive when you navigate away; clear the last sync so coming back starts clean
  useLayoutEffect(
    () => () => {
      setLast(null)
      setError('')
    },
    []
  )

  function push(id: string) {
    setError('')
    setBusy(id)
    startTransition(async () => {
      const res = await simulateBankTransaction(id).catch(() => ({ error: 'Could not reach the bank. Try again.' }))
      setBusy(null)
      if ('error' in res) setError(res.error)
      else setLast(res)
    })
  }

  return (
    <div className='space-y-3'>
      <p className='text-sm text-muted'>
        Demo Bank also sends transactions on its own while Today is open. Use these to send one now.
      </p>
      {ITEMS.map((item) => (
        <button
          key={item.id}
          disabled={busy !== null}
          onClick={() => push(item.id)}
          className='flex min-h-[56px] w-full items-center justify-between rounded-2xl bg-card p-4 text-left disabled:opacity-50'
        >
          <span>
            <span className='block font-mono text-sm font-semibold'>{item.merchant}</span>
            <span className='block text-xs text-muted'>{busy === item.id ? 'Categorising...' : 'Demo Bank · send now'}</span>
          </span>
          <span className={`font-display text-lg font-bold ${item.credit ? 'text-lime' : ''}`}>{item.amount}</span>
        </button>
      ))}
      {error && <p className='text-sm text-pink'>{error}</p>}
      {last && (
        <div className='space-y-2'>
          <SyncedToast synced={last} inline />
          <Link href='/dashboard' className='block text-center text-sm font-semibold text-blue'>
            See it on Today
          </Link>
        </div>
      )}
    </div>
  )
}
