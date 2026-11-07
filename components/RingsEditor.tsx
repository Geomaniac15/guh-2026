'use client'

import { useLayoutEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { saveRings } from '@/app/rings/actions'
import Rings from '@/components/Rings'
import RingPicker from '@/components/RingPicker'
import SplitSliders, { type Split } from '@/components/SplitSliders'
import { gbp, ringFromChoice, summary, type Profile, type Ring, type Transaction } from '@/lib/runway'

type Mode = Profile['ring_mode']
const MODES: [Mode, string][] = [
  ['runway', 'Runway'],
  ['basic', 'Basic'],
  ['custom', 'Custom'],
]
const SLOTS = ['Outer', 'Middle', 'Inner']
const DOTS = ['#FF8A3D', '#B8F25C', '#4DA3FF']

type Props = { profile: Profile; transactions: Transaction[]; now: number }

// Ring settings: pick a preset or three custom rings, preview live, save
export default function RingsEditor({ profile, transactions, now }: Props) {
  const [mode, setMode] = useState<Mode>(profile.ring_mode ?? 'runway')
  const [ringIds, setRingIds] = useState<string[]>(
    profile.rings?.length === 3
      ? profile.rings.map((r) => (r.id && ringFromChoice(r.id) ? r.id : 'allowance'))
      : ['allowance', 'savings', 'loan']
  )
  const [split, setSplit] = useState<Split>({
    needs: profile.needs_pct ?? 65,
    wants: profile.wants_pct ?? 30,
    savings: profile.savings_pct ?? 5,
  })
  const [picking, setPicking] = useState<number | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  // Close the picker and clear "Saved" if you navigate away (Next keeps the page alive in the background)
  useLayoutEffect(
    () => () => {
      setPicking(null)
      setMessage(null)
    },
    []
  )

  // Preview the draft exactly as the dashboard will compute it
  const draft: Profile = {
    ...profile,
    ring_mode: mode,
    rings: ringIds.map((id) => ringFromChoice(id)!),
    needs_pct: split.needs,
    wants_pct: split.wants,
    savings_pct: split.savings,
  }
  const s = summary(draft, transactions, new Date(now))
  const loanDate = new Date(now + s.untilLoan * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  function describe(ring: Ring) {
    switch (ring.kind) {
      case 'allowance':
        return `${gbp(s.allowance)} a day, recalculated nightly`
      case 'savings':
        return `${gbp(ring.target ?? Number(profile.weekly_savings_target))} a week`
      case 'loan':
        return s.shortfall > 0 ? `${Math.round(s.shortfall)} days short of ${loanDate}` : `On pace for ${loanDate}`
      case 'needs':
      case 'wants':
        return `${ring.kind === 'needs' ? split.needs : split.wants}% of your pot`
      case 'category':
        return `Under ${gbp(ring.target ?? 25)} a week`
    }
  }

  function save() {
    setMessage(null)
    startTransition(async () => {
      const res = await saveRings({ mode, ringIds, split }).catch(() => ({ error: 'Could not save. Try again.' }))
      setMessage('error' in res && res.error ? { ok: false, text: res.error } : { ok: true, text: 'Saved. Your dashboard and widgets now use these rings.' })
    })
  }

  return (
    <div className='flex flex-1 flex-col gap-5'>
      <div className='grid grid-cols-3 gap-1 rounded-2xl bg-card p-1'>
        {MODES.map(([value, label]) => (
          <button
            key={value}
            type='button'
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={`rounded-xl py-2.5 text-sm font-semibold ${mode === value ? 'bg-foreground text-background' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className='flex justify-center'>
        <Rings progress={s.progress} size={170} />
      </div>

      {mode === 'basic' ? (
        <SplitSliders split={split} pot={Number(profile.pot)} onChange={setSplit} />
      ) : (
        <ul className='space-y-3'>
          {s.rings.map((ring, i) => (
            <li key={i} className='flex items-center gap-3 rounded-2xl bg-card p-4'>
              <span className='size-3 shrink-0 rounded-full' style={{ background: DOTS[i] }} />
              <div className='min-w-0 flex-1'>
                <p className='text-xs text-muted'>{SLOTS[i]} ring</p>
                <p className='font-semibold'>{ring.label}</p>
                <p className='text-sm text-muted'>{describe(ring)}</p>
              </div>
              {mode === 'custom' && (
                <button
                  type='button'
                  onClick={() => setPicking(i)}
                  className='rounded-xl border border-line px-3 py-2 text-sm font-semibold'
                >
                  Change
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

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
        <button
          onClick={save}
          disabled={pending}
          className='w-full rounded-2xl bg-blue py-4 font-semibold text-[#0B0D12] disabled:opacity-50'
        >
          {pending ? 'Saving...' : 'Save rings'}
        </button>
      </div>

      {picking !== null && (
        <RingPicker
          title={`${SLOTS[picking]} ring`}
          selected={ringIds[picking]}
          onPick={(id) => {
            setRingIds(ringIds.map((r, i) => (i === picking ? id : r)))
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  )
}
