import Gauge from '@/components/Gauge'
import type { Gauges } from '@/lib/runway'

const pct = (n: number) => `${Math.round(n * 100)}%`

// Needs | Total | Wants dials with a savings bar underneath. Percentages only, never pounds.
export default function GaugeCluster({ g, compact }: { g: Gauges; compact?: boolean }) {
  const small = compact ? 84 : 96
  const big = compact ? 120 : 140
  return (
    <div className='space-y-4'>
      <div className='flex items-end justify-between gap-1'>
        <Dial name='Needs' colour='#4DA3FF' reading={g.needs} pace={g.pace} size={small} />
        <div className='flex flex-col items-center'>
          <Gauge fill={g.total.fill} pace={g.pace} size={big} label={`Total ${pct(g.total.fill)} left, ${g.total.status}`} />
          <p className='-mt-1 text-sm text-muted'>
            Total <span className='font-bold text-foreground'>{pct(g.total.fill)}</span>
            {!compact && <span> · {g.total.status === 'On track' ? 'on pace' : 'too fast'}</span>}
          </p>
        </div>
        <Dial name='Wants' colour='#FF8A3D' reading={g.wants} pace={g.pace} size={small} />
      </div>
      <SavingsBar fill={g.savings.fill} />
    </div>
  )
}

function Dial(props: { name: string; colour: string; reading: Gauges['needs']; pace: number; size: number }) {
  const { name, colour, reading, pace, size } = props
  return (
    <div className='flex flex-col items-center'>
      <Gauge fill={reading.fill} pace={pace} colour={colour} size={size} label={`${name} ${pct(reading.fill)} left, ${reading.status}`} />
      <p className='-mt-1 text-sm text-muted'>
        {name} <span className='font-bold' style={{ color: name === 'Wants' ? colour : '#F4F5F7' }}>{pct(reading.fill)}</span>
      </p>
    </div>
  )
}

export function SavingsBar({ fill }: { fill: number }) {
  return (
    <div className='flex items-center gap-3 text-sm'>
      <span className='text-muted'>Savings</span>
      <span className='h-2 flex-1 overflow-hidden rounded-full bg-line'>
        <span className='block h-full rounded-full bg-lime transition-[width] duration-700' style={{ width: pct(fill) }} />
      </span>
      <span className='w-10 text-right font-bold'>{pct(fill)}</span>
    </div>
  )
}
