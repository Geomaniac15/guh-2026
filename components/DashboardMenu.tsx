'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AddResult } from '@/app/dashboard/actions'
import AddForm from '@/components/AddForm'
import AddResultView from '@/components/AddResultView'
import { lockApp } from '@/lib/appLock'

const item = 'flex min-h-[48px] w-full items-center px-4 text-left font-semibold'

// ⋯ menu in the dashboard header: cash entry, demo shortcuts, lock and log out
export default function DashboardMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [result, setResult] = useState<Exclude<AddResult, { error: string }> | null>(null)
  const [status, setStatus] = useState('')

  function closeAdd() {
    setAdding(false)
    setResult(null)
  }

  async function loadDemo() {
    setStatus('Loading demo data...')
    const res = await fetch('/api/seed', { method: 'POST' }).catch(() => null)
    const json = res ? await res.json().catch(() => ({})) : { error: 'Network error' }
    if (json.error) return setStatus(`Failed: ${json.error}`)
    setStatus('')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        aria-label='More'
        aria-haspopup='dialog'
        className='flex size-11 items-center justify-center rounded-full bg-card text-muted'
      >
        <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor' aria-hidden>
          <circle cx='5' cy='12' r='1.8' />
          <circle cx='12' cy='12' r='1.8' />
          <circle cx='19' cy='12' r='1.8' />
        </svg>
      </button>

      {open && (
        <div className='fixed inset-0 z-50 flex items-end bg-black/60' onClick={() => setOpen(false)}>
          <div
            role='dialog'
            aria-label='More'
            onClick={(e) => e.stopPropagation()}
            className='mx-auto w-full max-w-[420px] rounded-t-3xl bg-card pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2'
          >
            <ul className='divide-y divide-line'>
              <li>
                <button
                  type='button'
                  className={item}
                  onClick={() => {
                    setOpen(false)
                    setAdding(true)
                  }}
                >
                  Add cash
                </button>
              </li>
              <li>
                <button
                  type='button'
                  className={item}
                  onClick={() => {
                    lockApp()
                    router.replace('/locked')
                  }}
                >
                  Lock app
                </button>
              </li>
              <li>
                <Link href='/widget' className={item}>Widget preview</Link>
              </li>
              <li>
                <Link href='/night/lock' className={item}>Lock screen</Link>
              </li>
              <li>
                <Link href='/connect/simulate' className={item}>Simulate bank transaction</Link>
              </li>
              <li>
                <button type='button' className={item} disabled={!!status && !status.startsWith('Failed')} onClick={loadDemo}>
                  {status || 'Load demo data'}
                </button>
              </li>
              <li>
                <form action='/auth/signout' method='post' onSubmit={() => lockApp()}>
                  <button className={`${item} text-pink`}>Log out</button>
                </form>
              </li>
            </ul>
            <button type='button' onClick={() => setOpen(false)} className='mt-2 w-full py-3 font-semibold text-blue'>
              Close
            </button>
          </div>
        </div>
      )}

      {adding && (
        <div className='fixed inset-0 z-50 overflow-y-auto bg-background'>
          <div className='mx-auto flex min-h-full w-full max-w-[420px] flex-col px-5 py-8'>
            {result ? (
              <AddResultView result={result} onDone={closeAdd} />
            ) : (
              <AddForm kind='spend' onCancel={closeAdd} onSaved={setResult} />
            )}
          </div>
        </div>
      )}
    </>
  )
}
