// Road to loan day: grey road = time until the loan, calm car at today, road block where fuel runs out
// at your usual pace, dimmed road past it, flag at loan day. ticks = extra date marks (0–1 along the road).
type Props = { reach: number; flag?: boolean; ticks?: number[] }

export const ROAD = { start: 4, end: 272 } // road x-range in the 300-wide viewBox, for lining up labels

export default function LoanRoad({ reach, flag = true, ticks = [] }: Props) {
  const r = Math.min(1, Math.max(0, reach))
  const { start, end } = ROAD
  const block = start + (end - start) * r
  const short = r < 1
  return (
    <svg viewBox='0 0 300 60' className='h-auto w-full' role='img' aria-label={short ? 'Fuel runs out before loan day' : 'Fuel lasts to loan day'}>
      {/* Road, dimmed past the block */}
      <rect x={start} y='34' width={end - start} height='14' rx='5' fill='#2B2F38' />
      {short && <rect x={block} y='34' width={end - block} height='14' rx='5' fill='#1A1D23' />}
      <line x1={start + 2} y1='34.5' x2={end - 2} y2='34.5' stroke='#3A3F4A' strokeWidth='1' />
      <line x1='44' y1='41' x2={Math.max(44, block - 6)} y2='41' stroke='#8A93A3' strokeWidth='1.6' strokeDasharray='7 6' />

      {ticks.map((t) => (
        <line key={t} x1={start + (end - start) * t} y1='51' x2={start + (end - start) * t} y2='57' stroke='#4A5160' strokeWidth='1.5' />
      ))}

      {/* Calm little car at today */}
      <g transform='translate(8 18)'>
        <path d='M2 15 Q2 11 6 10.5 L10 4.5 Q11.5 2.5 14 2.5 H24 Q26.5 2.5 28 4.5 L31.5 10 Q35 10.5 35 14 V17 H2 Z' fill='#A9C1E8' />
        <path d='M11.5 9.5 L14 5 H18 V9.5 Z M20 5 H24 Q25 5 25.8 6 L28 9.5 H20 Z' fill='#5B6B86' />
        <circle cx='10' cy='17' r='3.6' fill='#14161B' stroke='#A9C1E8' strokeWidth='1.2' />
        <circle cx='27' cy='17' r='3.6' fill='#14161B' stroke='#A9C1E8' strokeWidth='1.2' />
      </g>

      {/* Road block where fuel runs out */}
      {short && (
        <g transform={`translate(${block - 10} 0)`}>
          <line x1='4' y1='30' x2='2' y2='52' stroke='#C9CED8' strokeWidth='1.6' />
          <line x1='16' y1='30' x2='18' y2='52' stroke='#C9CED8' strokeWidth='1.6' />
          <rect x='0' y='25' width='20' height='7' rx='1' fill='#F4F5F7' />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${i * 5 + 1} 32 L${i * 5 + 4} 25 H${i * 5 + 6.5} L${i * 5 + 3.5} 32 Z`} fill='#F08F86' />
          ))}
          <circle cx='10' cy='21.5' r='2.4' fill='#F5B94A' />
        </g>
      )}

      {/* Flag at loan day */}
      {flag && (
        <g>
          <line x1='286' y1='8' x2='286' y2='40' stroke='#F4F5F7' strokeWidth='1.8' strokeLinecap='round' />
          <rect x='287' y='8' width='10' height='7' fill='#F4F5F7' />
          <rect x='287' y='8' width='3.3' height='3.5' fill='#0B0D12' />
          <rect x='293.6' y='8' width='3.4' height='3.5' fill='#0B0D12' />
          <rect x='290.3' y='11.5' width='3.3' height='3.5' fill='#0B0D12' />
        </g>
      )}
    </svg>
  )
}
