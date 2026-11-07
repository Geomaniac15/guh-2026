// The runway as a road: car at today, lime = how far the money lasts, pink dashes = the gap, flag = loan day
type Props = { runway: number; untilLoan: number; colour?: string }

export default function RangeRoad({ runway, untilLoan, colour = '#B8F25C' }: Props) {
  const reach = untilLoan > 0 ? Math.min(1, runway / untilLoan) : 1
  const x0 = 16
  const x1 = 284
  const end = x0 + (x1 - x0) * reach
  return (
    <svg viewBox='0 0 300 34' className='h-auto w-full' role='img' aria-label={`Money lasts ${Math.round(runway)} of ${untilLoan} days to the loan`}>
      <line x1={x0} y1='26' x2={end} y2='26' stroke={colour} strokeWidth='3.5' strokeLinecap='round' style={{ transition: 'all 0.8s ease' }} />
      {reach < 1 && (
        <line x1={end + 5} y1='26' x2={x1} y2='26' stroke='#FF6B8A' strokeWidth='3.5' strokeLinecap='round' strokeDasharray='4 5' />
      )}
      {/* Car */}
      <g transform='translate(2 9)' fill='#F4F5F7'>
        <path d='M3 11 L5.5 5.5 Q6.5 3.5 9 3.5 H17 Q19.5 3.5 21 5.5 L24 9 H27 Q29 9 29 11 V14 H3 Z' />
        <circle cx='9' cy='14.5' r='3' stroke='#0B0D12' strokeWidth='1.5' />
        <circle cx='23' cy='14.5' r='3' stroke='#0B0D12' strokeWidth='1.5' />
        <path d='M9.5 5.5 H13 V8.5 H7.8 Z M15 5.5 H17.5 Q18.7 5.5 19.6 6.8 L21 8.5 H15 Z' fill='#0B0D12' />
      </g>
      {/* Loan day flag */}
      <g stroke='#F4F5F7' strokeWidth='2' strokeLinecap='round'>
        <line x1={x1 + 4} y1='30' x2={x1 + 4} y2='4' />
      </g>
      <path d={`M${x1 + 5} 4 h9 l-2.5 3.5 l2.5 3.5 h-9 Z`} fill='#F4F5F7' />
    </svg>
  )
}
