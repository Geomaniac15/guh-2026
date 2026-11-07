'use client'

import { gbp } from '@/lib/runway'

export type Split = { needs: number; wants: number; savings: number }

const ROWS: [keyof Split, string, string][] = [
  ['needs', 'Needs', '#FF8A3D'],
  ['wants', 'Wants', '#B8F25C'],
  ['savings', 'Savings', '#4DA3FF'],
]

// Savings is whatever is left. Needs/Wants only trade with Savings; Savings only trades with Wants.
// Each slider stops when the one it trades with hits 0, so nothing else moves unexpectedly.
export function rebalance(split: Split, key: keyof Split, value: number): Split {
  const { needs, wants } = split
  if (key === 'needs') {
    const n = Math.min(value, 100 - wants)
    return { needs: n, wants, savings: 100 - n - wants }
  }
  if (key === 'wants') {
    const w = Math.min(value, 100 - needs)
    return { needs, wants: w, savings: 100 - needs - w }
  }
  const s = Math.min(value, 100 - needs)
  return { needs, wants: 100 - needs - s, savings: s }
}

// Needs / Wants / Savings split of this term's money
export default function SplitSliders({ split, pot, onChange }: { split: Split; pot: number; onChange: (s: Split) => void }) {
  return (
    <div className='space-y-4'>
      <div className='space-y-4 rounded-2xl bg-card p-4'>
        <p className='font-semibold'>How you split this term&apos;s money</p>
        {ROWS.map(([key, label, colour]) => (
          <label key={key} className='block space-y-2'>
            <span className='flex items-center justify-between text-sm'>
              <span className='flex items-center gap-2 font-semibold'>
                <span className='size-2.5 rounded-full' style={{ background: colour }} />
                {label}
              </span>
              <span className='text-muted'>
                {split[key]}% · {gbp((pot * split[key]) / 100)}
              </span>
            </span>
            <input
              type='range'
              min='0'
              max='100'
              value={split[key]}
              onChange={(e) => onChange(rebalance(split, key, Number(e.target.value)))}
              className='w-full'
              style={{ accentColor: colour }}
            />
          </label>
        ))}
      </div>
      <p className='text-sm text-muted'>
        Starts from the 50/30/20 rule. Drag to set a split that works on a student budget: savings is whatever
        needs and wants leave.{' '}
        <button type='button' onClick={() => onChange({ needs: 50, wants: 30, savings: 20 })} className='font-semibold text-blue'>
          Use 50/30/20
        </button>
      </p>
    </div>
  )
}
