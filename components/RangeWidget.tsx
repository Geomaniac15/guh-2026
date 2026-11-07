import LoanRoad, { ROAD } from '@/components/LoanRoad'
import { gbp } from '@/lib/runway'

const DAY = 86400000
const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

type Props = {
  size: 'small' | 'medium' | 'large'
  runway: number
  untilLoan: number
  now: number
  // In the app only: £ a week less spending that would close the gap. Widgets leave it out (no pounds).
  gapPerWeek?: number
}

// Range to loan day, in the three widget sizes. Days and dates only unless gapPerWeek is passed.
export default function RangeWidget({ size, runway, untilLoan, now, gapPerWeek }: Props) {
  const short = Math.round(untilLoan - runway)
  const reach = untilLoan > 0 ? runway / untilLoan : 1
  const runsOut = new Date(now + runway * DAY)
  const loan = new Date(now + untilLoan * DAY)
  const days = `${Math.round(runway)} days`
  const card = 'rounded-[22px] bg-card p-4'

  if (size === 'small') {
    return (
      <div className={`${card} flex aspect-square flex-col`}>
        <p className='text-sm text-muted'>Range</p>
        <p className='font-display text-2xl font-bold'>{days}</p>
        <p className={`text-xs ${short > 0 ? 'text-pink' : 'text-lime'}`}>
          {short > 0 ? `${short} short of loan day` : `${-short} days to spare`}
        </p>
        <div className='mt-auto'>
          <LoanRoad reach={reach} flag={false} />
        </div>
      </div>
    )
  }

  // Month starts between today and the end of the road, as date ticks (large only)
  const ticks: { t: number; label: string }[] = []
  if (size === 'large' && untilLoan > 0) {
    const d = new Date(now)
    for (let m = 1; m < 6; m++) {
      const first = new Date(d.getFullYear(), d.getMonth() + m, 1)
      const t = (first.getTime() - now) / (untilLoan * DAY)
      if (t > 0.12 && t < 0.88 && Math.abs(t - reach) > 0.15) ticks.push({ t, label: fmt(first) })
    }
  }
  const at = (t: number) => `${((ROAD.start + (ROAD.end - ROAD.start) * t) / 300) * 100}%`

  return (
    <div className={card}>
      <div className='flex items-start justify-between'>
        <div>
          <p className='text-sm text-muted'>Range</p>
          <p className={`font-display font-bold ${size === 'large' ? 'text-3xl' : 'text-2xl'}`}>{days}</p>
        </div>
        <div className='text-right'>
          <p className='text-sm text-muted'>Loan day</p>
          <p className='font-display text-lg font-bold'>
            {fmt(loan)}
            {size === 'large' && ` · in ${untilLoan} days`}
          </p>
        </div>
      </div>

      <div className='mt-2'>
        <LoanRoad reach={reach} ticks={[...ticks.map((x) => x.t), ...(short > 0 && size === 'large' ? [reach] : [])]} />
      </div>

      {size === 'medium' ? (
        <div className='flex justify-between text-sm'>
          <span className='text-muted'>Today</span>
          <span className={short > 0 ? 'text-pink' : 'text-lime'}>{short > 0 ? `${short} days short` : `${-short} days to spare`}</span>
        </div>
      ) : (
        <>
          <div className='relative h-5 text-xs text-muted'>
            <span className='absolute left-0'>Today</span>
            {ticks.map((x) => (
              <span key={x.t} className='absolute -translate-x-1/2' style={{ left: at(x.t) }}>
                {x.label}
              </span>
            ))}
            {short > 0 && (
              <span className='absolute -translate-x-1/2 whitespace-nowrap font-medium text-pink' style={{ left: at(Math.min(reach, 0.86)) }}>
                runs out {fmt(runsOut)}
              </span>
            )}
          </div>
          <dl className='mt-3 divide-y divide-line text-sm'>
            <Row label='Fuel runs out' value={fmt(runsOut)} />
            <Row
              label='Gap before loan day'
              value={short > 0 ? `${short} day${short === 1 ? '' : 's'}` : `None · ${-short} spare`}
              tone={short > 0 ? 'text-pink' : 'text-lime'}
            />
            <Row label='To close the gap' value={closeGap(short, untilLoan, gapPerWeek)} />
          </dl>
        </>
      )}
    </div>
  )
}

function closeGap(short: number, untilLoan: number, gapPerWeek?: number) {
  if (short <= 0) return "You're on course"
  if (gapPerWeek != null) return `Spend ${gbp(gapPerWeek)} less a week`
  return short <= untilLoan * 0.15 ? 'Slow down a little each week' : 'Pick up a shift or two'
}

function Row({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className='flex justify-between gap-3 py-2.5'>
      <dt className='text-muted'>{label}</dt>
      <dd className={`text-right font-medium ${tone}`}>{value}</dd>
    </div>
  )
}
