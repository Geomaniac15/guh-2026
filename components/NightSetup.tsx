'use client'

import { useState, useTransition } from 'react'
import { startNightOut } from '@/app/night/actions'
import FuelGauge from '@/components/FuelGauge'

const PICKS = [20, 30, 40, 50]

// Night out setup: pick tonight's budget, see what it costs in runway, start
export default function NightSetup({ avgDaily }: { avgDaily: number }) {
  const [budget, setBudget] = useState(30)
  const [keepTaxi, setKeepTaxi] = useState(true)
  const [showOnLock, setShowOnLock] = useState(true)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const days = Math.round((budget / avgDaily) * 10) / 10 // same as daysFor(budget)

  function start() {
    setError('')
    startTransition(async () => {
      const res = await startNightOut(budget, keepTaxi, showOnLock).catch(() => ({ error: 'Could not start. Try again.' }))
      if ('error' in res && res.error) setError(res.error)
    })
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='flex flex-col items-center rounded-2xl bg-card px-4 pb-5 pt-6'>
        <FuelGauge fill={1} size={210} />
        <p className='mt-2 text-sm text-muted'>Tonight&apos;s budget</p>
        <label className='mt-1 flex items-baseline border-b border-line font-display text-5xl font-bold'>
          £
          <input
            type='number'
            inputMode='decimal'
            min='1'
            max='500'
            value={budget || ''}
            onChange={(e) => setBudget(Number(e.target.value))}
            aria-label="Tonight's budget in pounds"
            className='w-28 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none'
          />
        </label>
        <p className='mt-3 text-sm text-muted'>
          Costs {days.toFixed(1)} days of range
        </p>
      </div>

      <div className='grid grid-cols-4 gap-2'>
        {PICKS.map((p) => (
          <button
            key={p}
            type='button'
            onClick={() => setBudget(p)}
            className={`rounded-2xl border py-3 font-semibold ${budget === p ? 'border-foreground bg-foreground text-background' : 'border-line bg-card'}`}
          >
            £{p}
          </button>
        ))}
      </div>

      <Toggle checked={keepTaxi} onChange={setKeepTaxi} title='Keep £8 for the taxi home' detail='Ring-fenced, never shows in the gauge' />
      <Toggle checked={showOnLock} onChange={setShowOnLock} title='Fuel gauge on lock screen' detail='A small fuel gauge, never pounds' />

      {error && <p className='text-sm text-pink'>{error}</p>}
      <button
        onClick={start}
        disabled={pending || budget < 1}
        className='mt-auto rounded-2xl bg-orange py-4 font-semibold text-[#0B0D12] disabled:opacity-50'
      >
        {pending ? 'Starting...' : 'Start night out'}
      </button>
    </div>
  )
}

function Toggle(props: { checked: boolean; onChange: (v: boolean) => void; title: string; detail: string }) {
  return (
    <label className='flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-card p-4'>
      <span>
        <span className='block font-semibold'>{props.title}</span>
        <span className='block text-sm text-muted'>{props.detail}</span>
      </span>
      <input
        type='checkbox'
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className='size-6 shrink-0 accent-[#B8F25C]'
      />
    </label>
  )
}
