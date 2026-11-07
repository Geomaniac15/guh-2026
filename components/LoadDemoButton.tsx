'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Resets the current user to the demo state via /api/seed
export default function LoadDemoButton() {
  const router = useRouter()
  const [status, setStatus] = useState('')

  async function load() {
    setStatus('Loading...')
    const res = await fetch('/api/seed', { method: 'POST' })
    const json = await res.json()
    setStatus(json.error ? `Failed: ${json.error}` : '')
    if (!json.error) router.refresh()
  }

  return (
    <div className='space-y-2'>
      <button
        className='rounded-2xl border border-[#262B36] bg-[#151922] px-4 py-2 text-sm font-semibold text-[#F4F5F7] disabled:opacity-50'
        disabled={status === 'Loading...'}
        onClick={load}
      >
        {status === 'Loading...' ? status : 'Load demo data'}
      </button>
      {status && status !== 'Loading...' && <p className='text-sm text-[#FF6B8A]'>{status}</p>}
    </div>
  )
}
