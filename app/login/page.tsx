'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handle(mode: 'login' | 'signup') {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) return setError(error.message)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className='flex flex-1 items-center justify-center p-6'>
      <div className='w-full max-w-sm space-y-4 rounded-xl border p-6 shadow-sm'>
        <h1 className='text-2xl font-semibold'>Log in</h1>
        <input
          className='w-full rounded-md border px-3 py-2'
          type='email'
          placeholder='Email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className='w-full rounded-md border px-3 py-2'
          type='password'
          placeholder='Password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className='text-sm text-red-600'>{error}</p>}
        <div className='flex gap-2'>
          <button
            className='flex-1 rounded-md bg-black px-3 py-2 text-white disabled:opacity-50'
            disabled={loading}
            onClick={() => handle('login')}
          >
            Log in
          </button>
          <button
            className='flex-1 rounded-md border px-3 py-2 disabled:opacity-50'
            disabled={loading}
            onClick={() => handle('signup')}
          >
            Sign up
          </button>
        </div>
        {/* Plain <a>: /demo signs in, so it must not be prefetched */}
        <a href='/demo' className='block rounded-md bg-lime px-3 py-2 text-center font-semibold text-[#0B0D12]'>
          Try the demo account
        </a>
      </div>
    </main>
  )
}
