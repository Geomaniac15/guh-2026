import type { Synced } from '@/app/connect/actions'
import { CATEGORY_LABELS, gbp } from '@/lib/runway'

// "NANDOS MANCHESTER −£15.00 · Takeaways AI · −1.1 days"
export default function SyncedToast({ synced, inline }: { synced: Synced; inline?: boolean }) {
  const shift = synced.kind === 'shift'
  return (
    <div
      role='status'
      className={`flex items-center gap-3 rounded-2xl border border-line bg-card p-3 ${inline ? '' : 'shadow-lg shadow-black/40'}`}
    >
      <span className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue/15 text-blue'>
        <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden>
          <path d='M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18' />
        </svg>
      </span>
      <span className='min-w-0 flex-1'>
        <span className='flex items-center justify-between gap-2'>
          <span className='truncate text-sm font-semibold'>{synced.merchant}</span>
          <span className={`shrink-0 font-display text-sm font-bold ${shift ? 'text-lime' : ''}`}>
            {shift ? '+' : '−'}
            {gbp(synced.amount)}
          </span>
        </span>
        <span className='mt-0.5 flex items-center gap-1.5 text-xs text-muted'>
          {shift ? 'Shift pay' : CATEGORY_LABELS[synced.category ?? 'other']}
          {synced.ai && <span className='rounded-full bg-blue/15 px-1.5 font-semibold text-blue'>AI</span>}
          <span>·</span>
          <span className={shift ? 'text-lime' : synced.impact.startsWith('Covered') ? '' : 'text-orange'}>{synced.impact}</span>
        </span>
      </span>
    </div>
  )
}
