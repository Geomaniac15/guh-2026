// Three concentric Activity-style rings. progress = [outer, middle, inner], each 0–1.
const COLOURS = ['#FF8A3D', '#B8F25C', '#4DA3FF']

export default function Rings({ progress, size = 140 }: { progress: number[]; size?: number }) {
  const stroke = size * 0.11
  const gap = stroke * 0.25
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className='-rotate-90 shrink-0' aria-hidden>
      {COLOURS.map((colour, i) => {
        const r = size / 2 - stroke / 2 - i * (stroke + gap)
        const p = Math.min(1, Math.max(0, progress[i] ?? 0))
        return (
          <g key={colour} fill='none' strokeWidth={stroke}>
            <circle cx={size / 2} cy={size / 2} r={r} stroke={colour} strokeOpacity={0.2} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={colour}
              strokeLinecap='round'
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - p}
              style={{
                animation: `ring-fill 1.2s cubic-bezier(.2,.8,.2,1) ${i * 0.12}s backwards`,
                transition: 'stroke-dashoffset 1s ease',
              }}
            />
          </g>
        )
      })}
    </svg>
  )
}
