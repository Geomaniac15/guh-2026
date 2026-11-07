'use client'

import { useRouter } from 'next/navigation'
import { lockApp } from '@/lib/appLock'

// "Lock app" button for the dashboard header
export default function LockButton() {
  const router = useRouter()
  return (
    <button
      type='button'
      onClick={() => {
        lockApp()
        router.replace('/locked')
      }}
      aria-label='Lock app'
      title='Lock app'
      className='flex size-9 items-center justify-center rounded-full bg-card text-muted'
    >
      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden>
        <rect x='5' y='11' width='14' height='10' rx='2' />
        <path d='M8 11V7a4 4 0 0 1 8 0v4' />
      </svg>
    </button>
  )
}
