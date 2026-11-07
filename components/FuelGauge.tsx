// Semicircle fuel gauge, E on the left and F on the right. fill = share of tonight's budget left (0–1).
type Props = { fill: number; size?: number; labels?: boolean }

export default function FuelGauge({ fill, size = 200, labels = true }: Props) {
  const f = Math.min(1, Math.max(0, fill))
  const colour = f > 0.25 ? '#B8F25C' : '#FF6B8A'
  const ticks = [0, 1, 2, 3, 4, 5, 6].map((i) => (Math.PI * i) / 6)

  return (
    <svg width={size} height={size * 0.62} viewBox='0 0 200 124' aria-label={`${Math.round(f * 100)}% of tonight's budget left`} role='img'>
      {labels &&
        ticks.map((a) => (
          <line
            key={a}
            x1={100 + 90 * Math.cos(a)}
            y1={100 - 90 * Math.sin(a)}
            x2={100 + 97 * Math.cos(a)}
            y2={100 - 97 * Math.sin(a)}
            stroke='#4A5160'
            strokeWidth='2'
            strokeLinecap='round'
          />
        ))}
      <path d='M20 100 A80 80 0 0 1 180 100' fill='none' stroke='#262B36' strokeWidth='16' strokeLinecap='round' />
      <path
        d='M20 100 A80 80 0 0 1 180 100'
        fill='none'
        stroke={colour}
        strokeWidth='16'
        strokeLinecap={f > 0 ? 'round' : 'butt'}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - f}
        style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s' }}
      />
      {/* Needle drawn pointing at F, rotated back towards E as fuel drops */}
      <g style={{ transform: `rotate(${-180 * (1 - f)}deg)`, transformOrigin: '100px 100px', transition: 'transform 0.8s ease' }}>
        <line x1='100' y1='100' x2='164' y2='100' stroke='#F4F5F7' strokeWidth='5' strokeLinecap='round' />
      </g>
      <circle cx='100' cy='100' r='8' fill='#F4F5F7' />
      {labels && (
        <>
          <text x='14' y='122' fill='#9AA3B2' fontSize='12' fontWeight='600'>E</text>
          <text x='178' y='122' fill='#9AA3B2' fontSize='12' fontWeight='600'>F</text>
        </>
      )}
    </svg>
  )
}
