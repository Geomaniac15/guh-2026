// Car-style fuel dial: E bottom-left, F bottom-right, pink reserve zone at E.
// fill = fuel left (0–1). pace = the triangle, where the needle should be today. No numbers drawn.
type Props = { fill: number; pace?: number | null; colour?: string; size?: number; labels?: boolean; label?: string }

const SWEEP = 200 // degrees from E to F
const START = 190 // angle of E, in maths degrees (0 = right, counter-clockwise)
const angle = (v: number) => START - SWEEP * v
const rad = (deg: number) => (deg * Math.PI) / 180
const pt = (r: number, v: number) => [60 + r * Math.cos(rad(angle(v))), 60 - r * Math.sin(rad(angle(v)))]

function arc(r: number, from: number, to: number) {
  const [x1, y1] = pt(r, from)
  const [x2, y2] = pt(r, to)
  const large = SWEEP * (to - from) > 180 ? 1 : 0
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

export default function Gauge({ fill, pace, colour = '#F4F5F7', size = 120, labels = true, label }: Props) {
  const f = Math.min(1, Math.max(0, fill))
  const needle = -angle(f) // SVG rotates clockwise; needle is drawn pointing right
  const ticks = Array.from({ length: 9 }, (_, i) => i / 8)

  return (
    <svg
      width={size}
      height={size * 0.75}
      viewBox='0 0 120 90'
      role='img'
      aria-label={label ?? `${Math.round(f * 100)}% left`}
      className='overflow-visible'
    >
      {/* Reserve zone and ticks */}
      <path d={arc(46, 0, 0.1)} fill='none' stroke='#FF6B8A' strokeWidth='3.5' strokeLinecap='round' />
      {ticks.map((v) => {
        const long = v === 0 || v === 0.5 || v === 1
        const [x1, y1] = pt(long ? 36 : 39, v)
        const [x2, y2] = pt(44, v)
        return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke='#F4F5F7' strokeOpacity={long ? 0.9 : 0.45} strokeWidth={long ? 2.5 : 1.6} strokeLinecap='round' />
      })}

      {/* Pace triangle: where you should be today */}
      {pace != null && (() => {
        const v = Math.min(1, Math.max(0, pace))
        const [tx, ty] = pt(50, v)
        return (
          <g transform={`translate(${tx} ${ty}) rotate(${90 - angle(v)})`}>
            <path d='M0 4 L-3.6 -3 L3.6 -3 Z' fill='#F4F5F7' />
          </g>
        )
      })()}

      {labels && (
        <>
          <text x={pt(30, 0)[0]} y={pt(30, 0)[1] + 3} fill='#F4F5F7' fontSize='9' fontWeight='600' textAnchor='middle'>E</text>
          <text x={pt(30, 1)[0]} y={pt(30, 1)[1] + 3} fill='#F4F5F7' fontSize='9' fontWeight='600' textAnchor='middle'>F</text>
          {/* Fuel pump */}
          <g transform='translate(54 34)' fill='none' stroke='#9AA3B2' strokeWidth='1.2' strokeLinejoin='round'>
            <rect x='0' y='0' width='7' height='10' rx='1' />
            <path d='M1.5 3h4M7 3.5h1.5l1.5 1.5v4.5a1 1 0 0 0 2 0V3l-1.5-1.5' />
          </g>
        </>
      )}

      {/* Needle sweeps up from E on first show */}
      <g
        transform={`rotate(${needle} 60 60)`}
        style={{
          transform: `rotate(${needle}deg)`,
          transformOrigin: '60px 60px',
          transition: 'transform 0.8s cubic-bezier(.2,.8,.2,1)',
          animation: 'needle-in 1.1s cubic-bezier(.2,.8,.2,1) backwards',
          ['--needle-from' as string]: `${-START}deg`,
        }}
      >
        <line x1='60' y1='60' x2='96' y2='60' stroke={colour} strokeWidth='3' strokeLinecap='round' />
      </g>
      <circle cx='60' cy='60' r='5' fill='#0B0D12' stroke={colour} strokeWidth='2.5' />
    </svg>
  )
}
