'use client'

import { useState, useTransition } from 'react'
import { connectBank } from '@/app/connect/actions'

// Connect / Reconnect Demo Bank
export default function ConnectButton({ connected }: { connected: boolean }) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  return (
    <div className='space-y-2'>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError('')
            const res = await connectBank().catch(() => ({ error: 'Could not connect. Try again.' }))
            if ('error' in res && res.error) setError(res.error)
          })
        }
        className={`w-full rounded-2xl py-3.5 font-semibold disabled:opacity-50 ${connected ? 'border border-line' : 'bg-blue text-[#0B0D12]'}`}
      >
        {pending ? 'Connecting...' : connected ? 'Reconnect' : 'Connect Demo Bank'}
      </button>
      {error && <p className='text-sm text-pink'>{error}</p>}
    </div>
  )
}
