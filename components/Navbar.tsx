import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Navbar() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const loggedIn = !!data?.claims

  return (
    <nav className='flex items-center justify-between border-b px-6 py-3'>
      <Link href='/' className='font-semibold'>
        GUH 2026
      </Link>
      <div className='flex items-center gap-4 text-sm'>
        {loggedIn ? (
          <>
            <Link href='/dashboard'>Dashboard</Link>
            <form action='/auth/signout' method='post'>
              <button className='underline'>Log out</button>
            </form>
          </>
        ) : (
          <Link href='/login'>Log in</Link>
        )}
      </div>
    </nav>
  )
}
