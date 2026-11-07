'use client'

import { useLayoutEffect, useState, useTransition } from 'react'
import { correctCategory } from '@/app/dashboard/actions'
import { CATEGORY_GROUP, CATEGORY_LABELS, gbp } from '@/lib/runway'

export type TxRow = {
  id: string
  kind: 'spend' | 'shift' | 'saving'
  amount: number
  category: string | null
  name: string
  when: string
  ai: boolean
}

// Latest transactions. Tap a spend to fix its category; Runway remembers the merchant.
export default function TransactionList({ rows }: { rows: TxRow[] }) {
  const [editing, setEditing] = useState<TxRow | null>(null)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  // Close the picker if you navigate away (Next keeps the page alive in the background)
  useLayoutEffect(() => () => setEditing(null), [])

  function pick(category: string) {
    if (!editing) return
    const tx = editing
    setError('')
    startTransition(async () => {
      const res = await correctCategory(tx.id, category).catch(() => ({ error: 'Could not save. Try again.' }))
      if ('error' in res && res.error) setError(res.error)
      else setEditing(null)
    })
  }

  if (!rows.length) {
    return <p className='rounded-2xl bg-card p-4 text-sm text-muted'>No transactions yet. They appear here as your bank sends them.</p>
  }

  return (
    <section className='space-y-2'>
      <h2 className='text-xs font-semibold uppercase tracking-wider text-muted'>Latest transactions</h2>
      <ul className='divide-y divide-line overflow-hidden rounded-2xl bg-card'>
        {rows.map((tx) => {
          const content = (
            <>
              <span className='min-w-0 flex-1'>
                <span className='block truncate font-semibold'>{tx.name}</span>
                <span className='mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted'>
                  <Chip tx={tx} />
                  {tx.ai && <span className='rounded-full bg-blue/15 px-2 py-0.5 font-semibold text-blue'>AI</span>}
                  <span>{tx.when}</span>
                </span>
              </span>
              <span className={`shrink-0 font-display font-bold ${tx.kind === 'shift' ? 'text-lime' : ''}`}>
                {tx.kind === 'shift' ? '+' : tx.kind === 'saving' ? '' : '−'}
                {gbp(tx.amount)}
              </span>
            </>
          )
          return (
            <li key={tx.id}>
              {tx.kind === 'spend' ? (
                <button
                  type='button'
                  onClick={() => setEditing(tx)}
                  aria-label={`${tx.name}, ${gbp(tx.amount)}, ${CATEGORY_LABELS[tx.category ?? 'other']}. Change category`}
                  className='flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left'
                >
                  {content}
                </button>
              ) : (
                <div className='flex min-h-[56px] items-center gap-3 px-4 py-3'>{content}</div>
              )}
            </li>
          )
        })}
      </ul>

      {editing && (
        <div className='fixed inset-0 z-50 flex items-end bg-black/60' onClick={() => !pending && setEditing(null)}>
          <div
            role='dialog'
            aria-label='Choose a category'
            onClick={(e) => e.stopPropagation()}
            className='mx-auto w-full max-w-[420px] space-y-4 rounded-t-3xl bg-card px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5'
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='truncate font-semibold'>{editing.name}</p>
                <p className='text-sm text-muted'>We&apos;ll use your choice for this shop from now on.</p>
              </div>
              <button type='button' onClick={() => setEditing(null)} className='font-semibold text-blue'>
                Cancel
              </button>
            </div>
            <div className='grid grid-cols-2 gap-2'>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type='button'
                  disabled={pending}
                  aria-pressed={editing.category === value}
                  onClick={() => pick(value)}
                  className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-left text-sm font-semibold disabled:opacity-50 ${editing.category === value ? 'border-foreground bg-foreground text-background' : 'border-line'}`}
                >
                  {label}
                  <span className={`block text-xs font-normal ${editing.category === value ? 'opacity-70' : 'text-muted'}`}>
                    {CATEGORY_GROUP[value] === 'needs' ? 'Need' : 'Want'}
                  </span>
                </button>
              ))}
            </div>
            {error && <p className='text-sm text-pink'>{error}</p>}
          </div>
        </div>
      )}
    </section>
  )
}

function Chip({ tx }: { tx: TxRow }) {
  if (tx.kind === 'shift') return <span className='rounded-full bg-lime/15 px-2 py-0.5 font-semibold text-lime'>Shift pay</span>
  if (tx.kind === 'saving') return <span className='rounded-full bg-blue/15 px-2 py-0.5 font-semibold text-blue'>Saved</span>
  const needs = CATEGORY_GROUP[tx.category ?? ''] === 'needs'
  return (
    <span className={`rounded-full px-2 py-0.5 font-semibold ${needs ? 'bg-orange/15 text-orange' : 'bg-line text-foreground'}`}>
      {CATEGORY_LABELS[tx.category ?? 'other'] ?? 'Other'}
    </span>
  )
}
