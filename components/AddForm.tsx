'use client'

import { useState } from 'react'
import { addTransaction, type AddResult } from '@/app/dashboard/actions'
import { CATEGORY_LABELS } from '@/lib/runway'

const CATEGORIES = Object.entries(CATEGORY_LABELS)

const input = 'w-full rounded-2xl border border-line bg-card px-4 py-3 text-lg outline-none focus:border-blue'
const label = 'block space-y-2 text-sm text-muted'

type Props = {
  kind: 'shift' | 'spend'
  onCancel: () => void
  onSaved: (r: Exclude<AddResult, { error: string }>) => void
}

// Form for a shift (place, hours, rate) or a spend (amount, category, note)
export default function AddForm({ kind, onCancel, onSaved }: Props) {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(formData: FormData) {
    setPending(true)
    setError('')
    try {
      const res = await addTransaction(formData)
      if ('error' in res) setError(res.error)
      else onSaved(res)
    } catch {
      setError('Could not save. Check your connection and try again.')
    }
    setPending(false)
  }

  return (
    <form action={submit} className='flex flex-1 flex-col gap-5'>
      <input type='hidden' name='kind' value={kind} />
      <div className='flex items-center justify-between'>
        <h1 className='font-display text-3xl font-bold'>{kind === 'shift' ? 'Add shift' : 'Add spend'}</h1>
        <button type='button' onClick={onCancel} className='font-semibold text-blue'>
          Cancel
        </button>
      </div>

      {kind === 'shift' ? (
        <>
          <label className={label}>
            <span>Where</span>
            <input name='note' required defaultValue='SU bar' className={input} />
          </label>
          <div className='grid grid-cols-2 gap-3'>
            <label className={label}>
              <span>Hours</span>
              <input name='hours' type='number' step='0.25' min='0.25' required defaultValue='4' className={input} />
            </label>
            <label className={label}>
              <span>Hourly rate (£)</span>
              <input name='rate' type='number' step='0.01' min='0.01' required defaultValue='12.00' className={input} />
            </label>
          </div>
        </>
      ) : (
        <>
          <label className={label}>
            <span>Amount (£)</span>
            <input name='amount' type='number' step='0.01' min='0.01' required autoFocus placeholder='15.00' className={input} />
          </label>
          <label className={label}>
            <span>Category</span>
            <select name='category' defaultValue='takeaways' className={input}>
              {CATEGORIES.map(([value, name]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            <span>Note</span>
            <input name='note' placeholder="Nando's" className={input} />
          </label>
        </>
      )}

      {error && <p className='text-sm text-pink'>{error}</p>}

      <button
        disabled={pending}
        className='mt-auto rounded-2xl bg-blue py-4 font-semibold text-[#0B0D12] disabled:opacity-50'
      >
        {pending ? 'Saving...' : kind === 'shift' ? 'Log shift' : 'Log spend'}
      </button>
    </form>
  )
}
