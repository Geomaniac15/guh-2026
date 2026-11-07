import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadRunway } from '@/lib/data'
import { nudge, summary } from '@/lib/runway'
import HomeWidget from '@/components/HomeWidget'
import LoadDemoButton from '@/components/LoadDemoButton'

// Fake iPhone home screen showing the Runway widgets
export default function WidgetPage() {
  return (
    <main className='mx-auto w-full max-w-[420px] flex-1 px-4 py-6'>
      <div className='min-h-[760px] rounded-[44px] bg-[#2A3142] px-5 pb-8 pt-14'>
        <Suspense fallback={<AppGrid />}>
          <Widgets />
        </Suspense>
      </div>
    </main>
  )
}

async function Widgets() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims) redirect('/login')

  const { profile, transactions, error } = await loadRunway(supabase, auth.claims.sub)
  if (error || !profile) {
    return (
      <div className='space-y-4 rounded-[22px] bg-background p-5 text-center'>
        <p className='text-muted'>{error ? 'Could not load your rings.' : 'No data yet.'}</p>
        <div className='flex justify-center'>
          <LoadDemoButton />
        </div>
      </div>
    )
  }

  const s = summary(profile, transactions)
  const props = { progress: s.progress, mood: s.mood, streak: profile.streak, nudge: nudge(s) }
  return (
    <AppGrid>
      <HomeWidget size='small' {...props} />
      <HomeWidget size='medium' {...props} />
    </AppGrid>
  )
}

// 4-column grid: widgets first, then placeholder app icons fill the gaps
function AppGrid({ children }: { children?: React.ReactNode }) {
  return (
    <div className='grid grid-flow-row-dense grid-cols-4 gap-x-5 gap-y-6'>
      {children}
      {Array.from({ length: children ? 12 : 20 }, (_, i) => (
        <div key={i} className='flex flex-col items-center gap-1.5'>
          <div className='aspect-square w-full rounded-[16px] bg-white/10' />
          <span className='text-[11px] text-white/70'>App</span>
        </div>
      ))}
    </div>
  )
}
