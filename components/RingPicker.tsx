'use client'

import { RING_CHOICES } from '@/lib/runway'

const GROUPS = ['Runway', 'Basic', 'Categories'] as const

type Props = { title: string; selected: string; onPick: (id: string) => void; onClose: () => void }

// Full-screen grouped list for choosing what one ring tracks
export default function RingPicker({ title, selected, onPick, onClose }: Props) {
  return (
    <div className='fixed inset-0 z-50 overflow-y-auto bg-background'>
      <div className='mx-auto w-full max-w-[420px] space-y-5 px-5 py-8'>
        <div className='flex items-center justify-between'>
          <h2 className='font-display text-3xl font-bold'>{title}</h2>
          <button type='button' onClick={onClose} className='font-semibold text-blue'>
            Done
          </button>
        </div>
        {GROUPS.map((group) => (
          <section key={group} className='space-y-2'>
            <h3 className='text-xs font-semibold uppercase tracking-wider text-muted'>{group}</h3>
            <ul className='divide-y divide-line overflow-hidden rounded-2xl bg-card'>
              {RING_CHOICES.filter((c) => c.group === group).map((c) => (
                <li key={c.id}>
                  <button
                    type='button'
                    onClick={() => onPick(c.id)}
                    aria-pressed={selected === c.id}
                    className='flex w-full items-center justify-between px-4 py-3 text-left'
                  >
                    <span>
                      <span className='block font-semibold'>{c.label}</span>
                      <span className='block text-sm text-muted'>
                        {c.target ? `${c.description}: £${c.target}` : c.description}
                      </span>
                    </span>
                    {selected === c.id && (
                      <svg width='18' height='18' viewBox='0 0 18 18' fill='none' stroke='#B8F25C' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' aria-hidden>
                        <path d='M3.5 9.5l3.5 3.5 7.5-8' />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
