'use client'

import { useState, useTransition } from 'react'
import { setBudgetMode } from '@/app/dashboard/actions'
import type { BudgetMode } from '@/lib/runway'

const MODES: [BudgetMode, string][] = [
  ['saver', 'Saver'],
  ['balanced', 'Balanced'],
  ['relaxed', 'Relaxed'],
]

// Saver / Balanced / Relaxed segmented control. Saves budget_mode and the page recalculates.
export default function ModePicker({ mode }: { mode: BudgetMode }) {
  const [selected, setSelected] = useState(mode)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function pick(next: BudgetMode) {
    setSelected(next)
    setError('')
    startTransition(async () => {
      const res = await setBudgetMode(next).catch(() => ({ error: 'Could not save' }))
      if ('error' in res && res.error) {
        setError(res.error)
        setSelected(mode)
      }
    })
  }

  return (
    <div className='space-y-2'>
      <div className={`grid grid-cols-3 gap-1 rounded-2xl bg-background p-1 ${pending ? 'opacity-60' : ''}`}>
        {MODES.map(([value, label]) => (
          <button
            key={value}
            type='button'
            disabled={pending}
            aria-pressed={selected === value}
            onClick={() => pick(value)}
            className={`rounded-xl py-2 text-sm font-semibold ${selected === value ? 'bg-foreground text-background' : 'text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className='text-sm text-pink'>{error}</p>}
    </div>
  )
}
