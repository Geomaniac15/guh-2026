'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { endNightOut, logNightSpend } from '@/app/night/actions'
import FuelGauge from '@/components/FuelGauge'
import { gbp } from '@/lib/runway'
import type { NightOut } from '@/lib/data'

const QUICK = [4, 6, 10]

// A night out in progress: big gauge, log a spend, end the night
export default function NightActive({ night, fill }: { night: NightOut; fill: number }) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const left = Math.max(0, Number(night.budget) - Number(night.spent))

  function run(action: () => Promise<{ error?: string; ok?: boolean }>) {
    setError('')
    startTransition(async () => {
      const res = await action().catch(() => ({ error: 'Could not save. Try again.' }))
      if (res.error) setError(res.error)
      else setAmount('')
    })
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='flex flex-col items-center rounded-2xl bg-card px-4 pb-5 pt-6'>
        <FuelGauge fill={fill} size={260} />
        <p className='mt-3 font-display text-5xl font-bold'>{gbp(left)}</p>
        <p className='text-sm text-muted'>left of {gbp(Number(night.budget))} tonight</p>
        {Number(night.taxi_reserve) > 0 && (
          <p className='mt-3 rounded-full bg-lime/10 px-3 py-1 text-sm text-lime'>
            {gbp(Number(night.taxi_reserve))} kept safe for the taxi home
          </p>
        )}
        {fill === 0 && <p className='mt-3 text-sm text-pink'>Tank&apos;s empty. Time for water and the taxi.</p>}
      </div>

      <div className='space-y-2 rounded-2xl bg-card p-4'>
        <p className='font-semibold'>Log spend</p>
        <div className='grid grid-cols-3 gap-2'>
          {QUICK.map((q) => (
            <button
              key={q}
              type='button'
              disabled={pending}
              onClick={() => run(() => logNightSpend(q))}
              className='rounded-xl border border-line py-3 font-semibold disabled:opacity-50'
            >
              £{q}
            </button>
          ))}
        </div>
        <form
          className='flex gap-2'
          onSubmit={(e) => {
            e.preventDefault()
            run(() => logNightSpend(Number(amount)))
          }}
        >
          <input
            type='number'
            inputMode='decimal'
            step='0.01'
            min='0.01'
            required
            placeholder='Other amount'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className='min-w-0 flex-1 rounded-xl border border-line bg-background px-3 py-3 outline-none focus:border-blue'
          />
          <button disabled={pending} className='rounded-xl bg-orange px-5 font-semibold text-[#0B0D12] disabled:opacity-50'>
            {pending ? '...' : 'Log'}
          </button>
        </form>
        {error && <p className='text-sm text-pink'>{error}</p>}
      </div>

      <div className='mt-auto space-y-3'>
        {night.show_on_lock && (
          <Link href='/night/lock' className='block rounded-2xl border border-line bg-card py-4 text-center font-semibold'>
            Show lock screen
          </Link>
        )}
        <button
          disabled={pending}
          onClick={() => run(endNightOut)}
          className='w-full rounded-2xl py-3 font-semibold text-muted disabled:opacity-50'
        >
          End night out
        </button>
      </div>
    </div>
  )
}
