'use client'

import type { AddResult } from '@/app/dashboard/actions'
import RangeWidget from '@/components/RangeWidget'
import { CATEGORY_LABELS, gbp } from '@/lib/runway'

// category/ai are set for bank feed transactions
type Props = { result: Exclude<AddResult, { error: string }> & { category?: string; ai?: boolean }; onDone: () => void }

// "+3.2 days of range" / "That cost 1.4 days" screen shown after logging
export default function AddResultView({ result, onDone }: Props) {
  const { kind, amount, note, days, covered, before, after, untilLoan, now } = result
  const shift = kind === 'shift'
  const up = after.allowance >= before.allowance

  return (
    <div className='flex flex-1 flex-col gap-6'>
      <div>
        <p className='text-sm text-muted'>Just now</p>
        <h1 className='font-display text-3xl font-bold'>{shift ? 'Shift logged' : 'Spend logged'}</h1>
      </div>

      <div className='flex items-center justify-between rounded-2xl bg-card p-4'>
        <div>
          <p className='font-semibold'>{note || (shift ? 'Shift' : 'Spend')}</p>
          <p className='flex items-center gap-1.5 text-sm text-muted'>
            {shift ? 'Shift pay' : result.category ? CATEGORY_LABELS[result.category] : 'Spend'}
            {result.ai && <span className='rounded-full bg-blue/15 px-2 py-0.5 text-xs font-semibold text-blue'>AI</span>}
          </p>
        </div>
        <p className='font-display text-2xl font-bold'>
          {shift ? '+' : '−'}
          {gbp(amount)}
        </p>
      </div>

      <div className='text-center'>
        {shift ? (
          <p className='font-display text-7xl font-bold text-lime'>+{days.toFixed(1)}</p>
        ) : covered ? (
          <p className='font-display text-3xl font-bold text-lime'>Covered by your essentials</p>
        ) : (
          <p className='font-display text-2xl font-semibold'>
            That cost <span className='text-6xl font-bold text-orange'>{days.toFixed(1)}</span>
          </p>
        )}
        {!covered && <p className='mt-2 text-lg font-medium'>days of range</p>}
      </div>

      <div className='flex items-center justify-center gap-6 text-center'>
        <div>
          <p className='font-display text-4xl font-bold text-muted'>{Math.round(before.runway)}</p>
          <p className='text-xs text-muted'>before</p>
        </div>
        <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='#9AA3B2' strokeWidth='2' strokeLinecap='round' aria-hidden>
          <path d='M5 12h14M13 6l6 6-6 6' />
        </svg>
        <div>
          <p className='font-display text-4xl font-bold'>{Math.round(after.runway)}</p>
          <p className='text-xs text-muted'>now</p>
        </div>
      </div>

      <RangeWidget size='medium' runway={after.runway} untilLoan={untilLoan} now={now} />

      <div className={`rounded-2xl p-4 text-sm ${up ? 'bg-lime/10 text-lime' : 'bg-orange/10 text-orange'}`}>
        {Math.abs(after.allowance - before.allowance) < 0.005
          ? `Daily allowance stays at ${gbp(after.allowance)}.`
          : `Daily allowance ${up ? 'raised' : 'lowered'} from ${gbp(before.allowance)} to ${gbp(after.allowance)}. It moves at most 12% a day.`}
      </div>

      <button onClick={onDone} className='mt-auto rounded-2xl bg-blue py-4 font-semibold text-[#0B0D12]'>
        Done
      </button>
    </div>
  )
}
