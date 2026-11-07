'use client'

import { useId } from 'react'

// Savings as a fuel can that fills up. fill 0–1.
export default function JerryCan({ fill, size = 80 }: { fill: number; size?: number }) {
  const f = Math.min(1, Math.max(0, fill))
  const clip = useId()
  const body = 'M6 22 Q6 18 10 18 H40 L50 28 V64 Q50 68 46 68 H10 Q6 68 6 64 Z'
  const top = 18 + 50 * (1 - f)
  return (
    <svg width={size} height={size * 1.1} viewBox='0 0 60 70' role='img' aria-label={`Savings ${Math.round(f * 100)}% of this week's goal`}>
      <defs>
        <clipPath id={clip}>
          <path d={body} />
        </clipPath>
      </defs>
      {/* Handle and spout */}
      <path d='M14 18 V11 Q14 9 16 9 H30 Q32 9 32 11 V18' fill='none' stroke='#4A5160' strokeWidth='3' />
      <path d='M42 20 L48 8 L54 10 L50 22' fill='none' stroke='#4A5160' strokeWidth='3' strokeLinejoin='round' />
      <path d={body} fill='#262B36' />
      <rect x='0' y={top} width='60' height='70' fill='#B8F25C' clipPath={`url(#${clip})`} style={{ transition: 'y 0.8s ease' }} />
      <path d={body} fill='none' stroke='#4A5160' strokeWidth='2' />
    </svg>
  )
}
