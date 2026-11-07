import Link from 'next/link'
import Gauge from '@/components/Gauge'

// Landing page
export default function Home() {
  return (
    <main className='mx-auto flex page-min-h w-full max-w-[420px] flex-col px-5 pb-10 pt-12'>
      <div className='flex flex-1 flex-col items-center justify-center gap-8 text-center'>
        <div className='flex items-end' aria-hidden>
          <Gauge fill={0.6} pace={0.55} colour='#4DA3FF' size={92} labels={false} />
          <Gauge fill={0.54} pace={0.55} size={150} />
          <Gauge fill={0.3} pace={0.55} colour='#FF8A3D' size={92} labels={false} />
        </div>
        <div className='space-y-4'>
          <h1 className='font-display text-5xl font-bold leading-[1.05] tracking-tight'>
            Your loan, counted in days
          </h1>
          <p className='text-lg text-muted'>
            Student money arrives in lumps, so Runway measures it in days: how long yours lasts until your next
            instalment.
          </p>
        </div>
      </div>

      <div className='space-y-3'>
        <Link href='/dashboard' className='block rounded-2xl bg-lime py-4 text-center font-semibold text-[#0B0D12]'>
          Try the demo
        </Link>
        <Link href='/login' className='block rounded-2xl border border-line bg-card py-4 text-center font-semibold'>
          Log in
        </Link>
      </div>
    </main>
  )
}
