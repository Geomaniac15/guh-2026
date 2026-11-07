'use client'

import { useLayoutEffect, useState, useTransition } from 'react'
import { correctCategory } from '@/app/dashboard/actions'
import { CATEGORY_GROUP, CATEGORY_LABELS, gbp, impactText, type Impact } from '@/lib/runway'

export type TxRow = {
  id: string
  kind: 'spend' | 'shift' | 'saving'
  amount: number
  category: string | null
  name: string
  when: string // short, for the list
  fullWhen: string // for the detail sheet
  source: 'bank' | 'manual'
  ai: boolean
  impact: Impact
}

const shortImpact = (i: Impact) =>
  i.type === 'cost' ? `−${i.days.toFixed(1)} days` : i.type === 'gain' ? `+${i.days.toFixed(1)} days` : i.type === 'covered' ? 'Essentials' : ''

// Latest transactions with their runway cost. Tap one for details and to fix its category.
export default function TransactionList({ rows }: { rows: TxRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  // Read from the latest rows so the sheet updates after a correction
  const open = rows.find((r) => r.id === openId) ?? null

  // Close the sheet if you navigate away (Next keeps the page alive in the background)
  useLayoutEffect(() => () => setOpenId(null), [])

  function pick(category: string) {
    if (!open || open.category === category) return
    const id = open.id
    setError('')
    startTransition(async () => {
      const res = await correctCategory(id, category).catch(() => ({ error: 'Could not save. Try again.' }))
      if ('error' in res && res.error) setError(res.error)
    })
  }

  if (!rows.length) {
    return <p className='rounded-2xl bg-card p-4 text-sm text-muted'>No transactions yet. They appear here as your bank sends them.</p>
  }

  return (
    <section className='space-y-2'>
      <h2 className='text-xs font-semibold uppercase tracking-wider text-muted'>Latest transactions</h2>
      <ul className='divide-y divide-line overflow-hidden rounded-2xl bg-card'>
        {rows.map((tx) => (
          <li key={tx.id}>
            <button
              type='button'
              onClick={() => {
                setError('')
                setOpenId(tx.id)
              }}
              aria-label={`${tx.name}, ${gbp(tx.amount)}. ${impactText(tx.impact)}. Show details`}
              className='flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left'
            >
              <span className='min-w-0 flex-1'>
                <span className='block truncate font-semibold'>{tx.name}</span>
                <span className='mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted'>
                  <Chip tx={tx} />
                  {tx.ai && <AiBadge />}
                  <span>{tx.when}</span>
                </span>
              </span>
              <span className='shrink-0 text-right'>
                <span className={`block font-display font-bold ${tx.kind === 'shift' ? 'text-lime' : ''}`}>
                  {tx.kind === 'shift' ? '+' : tx.kind === 'saving' ? '' : '−'}
                  {gbp(tx.amount)}
                </span>
                <span className={`block text-xs ${impactColour(tx.impact)}`}>{shortImpact(tx.impact)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div className='fixed inset-0 z-50 flex items-end bg-black/60' onClick={() => !pending && setOpenId(null)}>
          <div
            role='dialog'
            aria-label={`${open.name} details`}
            onClick={(e) => e.stopPropagation()}
            className='mx-auto max-h-[90dvh] w-full max-w-[420px] space-y-5 overflow-y-auto rounded-t-3xl bg-card px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5'
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='break-words font-mono text-sm font-semibold'>{open.name}</p>
                <p className='text-xs text-muted'>
                  {open.source === 'bank' ? 'Demo Bank' : 'Cash'} · {open.fullWhen}
                </p>
              </div>
              <button type='button' onClick={() => setOpenId(null)} className='min-h-[44px] font-semibold text-blue'>
                Done
              </button>
            </div>

            <div className='text-center'>
              <p className={`font-display text-5xl font-bold ${open.kind === 'shift' ? 'text-lime' : ''}`}>
                {open.kind === 'shift' ? '+' : open.kind === 'saving' ? '' : '−'}
                {gbp(open.amount)}
              </p>
              <p className={`mt-2 text-lg font-semibold ${impactColour(open.impact)}`}>{impactText(open.impact)}</p>
              <p className='mt-1 text-xs text-muted'>
                {open.impact.type === 'covered'
                  ? 'Needs come out of the money set aside for essentials.'
                  : open.impact.type === 'gain'
                    ? 'Part of this was already expected as shift income, so this is the extra.'
                    : open.impact.type === 'cost'
                      ? 'At your usual pace of spending.'
                      : ''}
              </p>
            </div>

            {open.kind === 'spend' && (
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm font-semibold'>Category</p>
                  {open.ai ? (
                    <span className='flex items-center gap-1.5 text-xs text-muted'>
                      <AiBadge /> Picked by Qwen. Tap to correct.
                    </span>
                  ) : (
                    <span className='text-xs text-muted'>{pending ? 'Saving...' : 'We remember your choice for this shop.'}</span>
                  )}
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      type='button'
                      disabled={pending}
                      aria-pressed={open.category === value}
                      onClick={() => pick(value)}
                      className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-left text-sm font-semibold disabled:opacity-50 ${open.category === value ? 'border-foreground bg-foreground text-background' : 'border-line'}`}
                    >
                      {label}
                      <span className={`block text-xs font-normal ${open.category === value ? 'opacity-70' : 'text-muted'}`}>
                        {CATEGORY_GROUP[value] === 'needs' ? 'Need' : 'Want'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {error && <p className='text-sm text-pink'>{error}</p>}
          </div>
        </div>
      )}
    </section>
  )
}

const impactColour = (i: Impact) => (i.type === 'cost' ? 'text-orange' : i.type === 'gain' ? 'text-lime' : 'text-muted')

const AiBadge = () => <span className='rounded-full bg-blue/15 px-2 py-0.5 font-semibold text-blue'>AI</span>

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
