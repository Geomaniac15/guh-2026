'use client'

import { useLayoutEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { simulateBankTransaction } from '@/app/connect/actions'
import AddResultView from '@/components/AddResultView'
import type { AddResult } from '@/lib/record'

const ITEMS = [
  { id: 'payroll', merchant: 'SU BAR PAYROLL', amount: '+£48.00', credit: true },
  { id: 'nandos', merchant: 'NANDOS MANCHESTER', amount: '£15.00' },
  { id: 'tesco', merchant: 'TESCO STORES 2041', amount: '£6.40' },
  { id: 'uber', merchant: 'UBER *TRIP', amount: '£9.20' },
]

// Buttons that push a Demo Bank transaction, then show the usual result screen
export default function SimulateBank() {
  const router = useRouter()
  const [result, setResult] = useState<Exclude<AddResult, { error: string }> | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  // Next keeps this page alive when you navigate away; close the result so coming back shows the buttons
  useLayoutEffect(() => () => setResult(null), [])

  function push(id: string) {
    setError('')
    setBusy(id)
    startTransition(async () => {
      const res = await simulateBankTransaction(id).catch(() => ({ error: 'Could not reach the bank. Try again.' }))
      setBusy(null)
      if ('error' in res) setError(res.error)
      else setResult(res)
    })
  }

  return (
    <div className='space-y-3'>
      <p className='text-sm text-muted'>Each one arrives like a real card payment: categorised, added to your runway.</p>
      {ITEMS.map((item) => (
        <button
          key={item.id}
          disabled={busy !== null}
          onClick={() => push(item.id)}
          className='flex w-full items-center justify-between rounded-2xl bg-card p-4 text-left disabled:opacity-50'
        >
          <span>
            <span className='block font-mono text-sm font-semibold'>{item.merchant}</span>
            <span className='block text-xs text-muted'>{busy === item.id ? 'Categorising...' : 'Demo Bank · just now'}</span>
          </span>
          <span className={`font-display text-lg font-bold ${item.credit ? 'text-lime' : ''}`}>{item.amount}</span>
        </button>
      ))}
      {error && <p className='text-sm text-pink'>{error}</p>}

      {result && (
        <div className='fixed inset-0 z-50 overflow-y-auto bg-background'>
          <div className='mx-auto flex min-h-full w-full max-w-[420px] flex-col px-5 py-8'>
            <AddResultView
              result={result}
              onDone={() => {
                setResult(null)
                router.push('/dashboard')
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
