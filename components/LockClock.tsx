'use client'

import { useSyncExternalStore } from 'react'

const subscribe = (tick: () => void) => {
  const id = setInterval(tick, 1000)
  return () => clearInterval(id)
}
const minuteNow = () => Math.floor(Date.now() / 60000)

// Live lock screen clock. Renders only on the client so server and browser times never mismatch.
export default function LockClock() {
  const minute = useSyncExternalStore(subscribe, minuteNow, () => 0)
  if (!minute) return <div className='h-[124px]' />
  const now = new Date(minute * 60000)
  return (
    <div className='text-center'>
      <p className='text-lg font-semibold'>
        {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      <p className='font-display text-[96px] font-bold leading-none tracking-tight'>
        {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}
