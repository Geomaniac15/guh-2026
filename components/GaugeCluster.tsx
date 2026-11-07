import Gauge from '@/components/Gauge'
import { gbp, type Gauges } from '@/lib/runway'

const pct = (n: number) => `${Math.round(n * 100)}%`

const left = (r: Gauges['needs']) => gbp(Math.max(0, r.budget - r.spent))

// Needs | Total | Wants dials with a savings bar underneath.
// amounts: show pounds (in the app). Widgets and lock screens leave it off: percentages only.
export default function GaugeCluster({ g, compact, amounts }: { g: Gauges; compact?: boolean; amounts?: boolean }) {
  const small = compact ? 84 : 96
  const big = compact ? 120 : 140
  return (
    <div className='space-y-4'>
      <div className='flex items-end justify-between gap-1'>
        <Dial name='Needs' colour='#4DA3FF' reading={g.needs} pace={g.pace} size={small} amounts={amounts} />
        <div className='flex flex-col items-center'>
          <Gauge fill={g.total.fill} pace={g.pace} size={big} label={`Total ${pct(g.total.fill)} left, ${g.total.status}`} />
          <p className='-mt-1 text-sm text-muted'>
            Total <span className='font-bold text-foreground'>{pct(g.total.fill)}</span>
            {!compact && <span> · {g.total.status === 'On track' ? 'on pace' : 'too fast'}</span>}
          </p>
          {amounts && (
            <p className='text-xs text-muted'>
              {left(g.total)} left of {gbp(g.total.budget)}
            </p>
          )}
        </div>
        <Dial name='Wants' colour='#FF8A3D' reading={g.wants} pace={g.pace} size={small} amounts={amounts} />
      </div>
      <SavingsBar fill={g.savings.fill} note={amounts ? `${gbp(g.savings.saved)} of ${gbp(g.savings.target)}` : undefined} />
    </div>
  )
}

function Dial(props: { name: string; colour: string; reading: Gauges['needs']; pace: number; size: number; amounts?: boolean }) {
  const { name, colour, reading, pace, size, amounts } = props
  return (
    <div className='flex flex-col items-center'>
      <Gauge fill={reading.fill} pace={pace} colour={colour} size={size} label={`${name} ${pct(reading.fill)} left, ${reading.status}`} />
      <p className='-mt-1 text-sm text-muted'>
        {name} <span className='font-bold' style={{ color: name === 'Wants' ? colour : '#F4F5F7' }}>{pct(reading.fill)}</span>
      </p>
      {amounts && <p className='text-xs text-muted'>{left(reading)} left</p>}
    </div>
  )
}

export function SavingsBar({ fill, note }: { fill: number; note?: string }) {
  return (
    <div className='flex items-center gap-3 text-sm'>
      <span className='text-muted'>Savings</span>
      <span className='h-2 flex-1 overflow-hidden rounded-full bg-line'>
        <span className='block h-full rounded-full bg-lime transition-[width] duration-700' style={{ width: pct(fill) }} />
      </span>
      <span className='text-right font-bold'>
        {pct(fill)}
        {note && <span className='block text-xs font-normal text-muted'>{note}</span>}
      </span>
    </div>
  )
}
