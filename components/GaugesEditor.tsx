'use client'

import { useLayoutEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { saveGauge } from '@/app/rings/actions'
import GaugeCluster from '@/components/GaugeCluster'
import GaugeTile from '@/components/GaugeTile'
import ModePicker from '@/components/ModePicker'
import { CATEGORY_GROUP, CATEGORY_LABELS, CATEGORY_LIMITS, gauges, type Profile, type Transaction } from '@/lib/runway'

type Props = { profile: Profile; transactions: Transaction[]; now: number }

// Your gauges: live preview, the 4th gauge's category and weekly limit, and the budget style
export default function GaugesEditor({ profile, transactions, now }: Props) {
  const [category, setCategory] = useState(profile.gauge_category && CATEGORY_LIMITS[profile.gauge_category] ? profile.gauge_category : 'going_out')
  const [limit, setLimit] = useState(String(Number(profile.gauge_limit) || CATEGORY_LIMITS[category]))
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  // Clear "Saved" if you navigate away (Next keeps the page alive in the background)
  useLayoutEffect(() => () => setMessage(null), [])

  // Preview exactly what the dashboard and widgets will show
  const g = gauges({ ...profile, gauge_category: category, gauge_limit: Number(limit) || null }, transactions, new Date(now))

  function choose(next: string) {
    setCategory(next)
    setLimit(String(CATEGORY_LIMITS[next]))
    setMessage(null)
  }

  function save() {
    setMessage(null)
    startTransition(async () => {
      const res = await saveGauge(category, Number(limit)).catch(() => ({ error: 'Could not save. Try again.' }))
      setMessage('error' in res && res.error ? { ok: false, text: res.error } : { ok: true, text: 'Saved. Your dashboard and widgets now use this gauge.' })
    })
  }

  return (
    <div className='flex flex-1 flex-col gap-5'>
      <div className='rounded-2xl bg-card px-4 pb-4 pt-5'>
        <GaugeCluster g={g} />
      </div>
      <p className='text-sm text-muted'>
        Each needle is the fuel left this week. The triangle is where it should be today if you spread spending evenly:
        behind it means you&apos;re going too fast.
      </p>

      <section className='space-y-3'>
        <h2 className='text-xs font-semibold uppercase tracking-wider text-muted'>Your fourth gauge</h2>
        <div className='grid grid-cols-[1fr_1.2fr] gap-3'>
          <GaugeTile name={g.category.label} reading={g.category} colour='#FF6B8A' />
          <div className='flex flex-col gap-2'>
            <label className='block space-y-1 text-sm text-muted'>
              <span>Weekly limit (£)</span>
              <input
                type='number'
                inputMode='decimal'
                min='1'
                max='1000'
                value={limit}
                onChange={(e) => {
                  setLimit(e.target.value)
                  setMessage(null)
                }}
                className='w-full rounded-xl border border-line bg-card px-3 py-2.5 text-lg text-foreground outline-none focus:border-blue'
              />
            </label>
            <p className='text-xs text-muted'>
              {CATEGORY_GROUP[category] === 'needs' ? 'A needs category' : 'A wants category'}
            </p>
          </div>
        </div>
        <div className='grid grid-cols-2 gap-2'>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <button
              key={value}
              type='button'
              aria-pressed={category === value}
              onClick={() => choose(value)}
              className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-sm font-semibold ${category === value ? 'border-foreground bg-foreground text-background' : 'border-line'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className='space-y-2'>
        <h2 className='text-xs font-semibold uppercase tracking-wider text-muted'>Budget style</h2>
        <ModePicker mode={profile.budget_mode} />
        <p className='text-xs text-muted'>Changes how big the Wants tank is each week. Saves straight away.</p>
      </section>

      <div className='mt-auto space-y-3 pt-2'>
        {message && (
          <p className={`text-center text-sm ${message.ok ? 'text-lime' : 'text-pink'}`}>
            {message.text}{' '}
            {message.ok && (
              <Link href='/dashboard' className='font-semibold text-blue'>
                Back to today
              </Link>
            )}
          </p>
        )}
        <button onClick={save} disabled={pending} className='w-full rounded-2xl bg-blue py-4 font-semibold text-[#0B0D12] disabled:opacity-50'>
          {pending ? 'Saving...' : 'Save gauge'}
        </button>
      </div>
    </div>
  )
}
