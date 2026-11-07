import Gauge from '@/components/Gauge'
import { gbp, type GaugeReading } from '@/lib/runway'

// Small widget: one gauge with its name, % left and status. amounts adds pounds (in the app only).
export default function GaugeTile(props: { name: string; reading: GaugeReading; colour: string; caption?: string; amounts?: boolean }) {
  const { name, reading, colour, caption, amounts } = props
  const fast = reading.status === 'Too fast'
  return (
    <div className='flex aspect-square flex-col rounded-[22px] bg-card p-4'>
      <div className='flex items-center justify-between text-sm'>
        <span className='font-semibold'>{name}</span>
        <span className='text-muted'>{Math.round(reading.fill * 100)}%</span>
      </div>
      <div className='flex flex-1 items-center justify-center'>
        <Gauge fill={reading.fill} pace={reading.pace} colour={colour} size={110} label={`${name} ${Math.round(reading.fill * 100)}% left`} />
      </div>
      <p className={`text-center text-xs ${fast ? 'text-orange' : 'text-muted'}`}>
        {amounts ? `${gbp(Math.max(0, reading.budget - reading.spent))} left of ${gbp(reading.budget)}` : (caption ?? reading.status)}
      </p>
    </div>
  )
}
