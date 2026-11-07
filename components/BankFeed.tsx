'use client'

import { useEffect, useRef, useState } from 'react'
import { syncBank, type Synced } from '@/app/connect/actions'
import SyncedToast from '@/components/SyncedToast'

const EVERY_MS = 20000
const TOAST_MS = 6000

// Live Demo Bank feed on the dashboard: asks the bank for the next transaction every 20s and toasts it.
// Effects are cleaned up when the page is hidden, so it only runs while Today is on screen.
export default function BankFeed({ connected }: { connected: boolean }) {
  const [paused, setPaused] = useState(false)
  const [toast, setToast] = useState<Synced | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!connected || paused) return
    const tick = async () => {
      if (document.hidden) return
      const res = await syncBank().catch(() => null)
      if (!res || 'error' in res || 'skipped' in res) return
      setToast(res)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(() => setToast(null), TOAST_MS)
    }
    const id = setInterval(tick, EVERY_MS)
    return () => {
      clearInterval(id)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      setToast(null)
    }
  }, [connected, paused])

  if (!connected) return null

  return (
    <>
      <button
        type='button'
        onClick={() => setPaused(!paused)}
        aria-pressed={!paused}
        className='flex min-h-[32px] items-center gap-2 self-start rounded-full bg-card px-3 text-xs font-semibold text-muted'
      >
        <span className={`size-2 rounded-full ${paused ? 'bg-muted' : 'animate-pulse bg-lime'}`} />
        Demo Bank · {paused ? 'paused' : 'live'}
      </button>
      {toast && (
        <div className='fixed inset-x-0 bottom-[calc(var(--tabbar-h,0px)+12px)] z-40 px-4'>
          <div className='mx-auto max-w-[388px]'>
            <SyncedToast synced={toast} />
          </div>
        </div>
      )}
    </>
  )
}
