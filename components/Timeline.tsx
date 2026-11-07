// Runway vs loan card: blue = days the money lasts, pink = days short of the loan
const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

type Props = { runway: number; untilLoan: number; now: number }

export default function Timeline({ runway, untilLoan, now }: Props) {
  const runsOut = new Date(now + runway * 86400000)
  const loan = new Date(now + untilLoan * 86400000)
  const short = Math.round(untilLoan - runway)
  const total = Math.max(runway, untilLoan, 1)

  return (
    <div className='space-y-3 rounded-2xl bg-card p-4'>
      <p className='font-semibold'>
        {short > 0
          ? `You're ${short} day${short === 1 ? '' : 's'} short of your loan`
          : `You'll make it with ${-short} day${short === -1 ? '' : 's'} to spare`}
      </p>
      <div className='flex h-2.5 overflow-hidden rounded-full bg-pink/25'>
        <div
          className='rounded-full bg-blue transition-[width] duration-700'
          style={{ width: `${(Math.min(runway, total) / total) * 100}%` }}
        />
      </div>
      <div className='flex justify-between text-xs text-muted'>
        <span>Today</span>
        {short > 0 && <span className='font-medium text-pink'>Runs out {fmt(runsOut)}</span>}
        <span>Loan {fmt(loan)}</span>
      </div>
    </div>
  )
}
