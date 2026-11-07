'use client'

import { useState } from 'react'
import type { AddResult } from '@/app/dashboard/actions'
import AddForm from '@/components/AddForm'
import AddResultView from '@/components/AddResultView'

const Plus = () => (
  <svg width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' aria-hidden>
    <path d='M8 3v10M3 8h10' />
  </svg>
)

// Add shift / Add spend buttons, plus the full-screen sheet they open
export default function AddActions() {
  const [open, setOpen] = useState<'shift' | 'spend' | null>(null)
  const [result, setResult] = useState<Exclude<AddResult, { error: string }> | null>(null)

  function close() {
    setOpen(null)
    setResult(null)
  }

  return (
    <>
      <div className='grid grid-cols-2 gap-3'>
        <button
          onClick={() => setOpen('shift')}
          className='flex items-center justify-center gap-2 rounded-2xl bg-lime py-4 font-semibold text-[#0B0D12]'
        >
          <Plus /> Add shift
        </button>
        <button
          onClick={() => setOpen('spend')}
          className='flex items-center justify-center gap-2 rounded-2xl border border-line bg-card py-4 font-semibold'
        >
          <Plus /> Add spend
        </button>
      </div>

      {open && (
        <div className='fixed inset-0 z-50 overflow-y-auto bg-background'>
          <div className='mx-auto flex min-h-full w-full max-w-[420px] flex-col px-5 py-8'>
            {result ? (
              <AddResultView result={result} onDone={close} />
            ) : (
              <AddForm kind={open} onCancel={close} onSaved={setResult} />
            )}
          </div>
        </div>
      )}
    </>
  )
}
