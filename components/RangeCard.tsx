import RangeRoad from '@/components/RangeRoad'

const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

// "Range 57 days · Loan day 10 Jan" with the road, and how short (or spare) you are
export default function RangeCard({ runway, untilLoan, now }: { runway: number; untilLoan: number; now: number }) {
  const short = Math.round(untilLoan - runway)
  const loan = new Date(now + untilLoan * 86400000)
  return (
    <div className='space-y-3 rounded-2xl bg-card p-4'>
      <div className='flex items-start justify-between'>
        <div>
          <p className='text-sm text-muted'>Range</p>
          <p className='font-display text-3xl font-bold'>{Math.round(runway)} days</p>
        </div>
        <div className='text-right'>
          <p className='text-sm text-muted'>Loan day</p>
          <p className='font-display text-xl font-bold'>{fmt(loan)}</p>
        </div>
      </div>
      <RangeRoad runway={runway} untilLoan={untilLoan} />
      <div className='flex justify-between text-sm'>
        <span className='text-muted'>Today</span>
        {short > 0 ? (
          <span className='font-medium text-pink'>
            {short} day{short === 1 ? '' : 's'} short
          </span>
        ) : (
          <span className='font-medium text-lime'>
            {-short} day{short === -1 ? '' : 's'} to spare
          </span>
        )}
      </div>
    </div>
  )
}
