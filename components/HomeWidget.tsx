import Rings from '@/components/Rings'
import MoodChip from '@/components/MoodChip'
import Flame from '@/components/Flame'
import type { Mood } from '@/lib/runway'

type Props = { size: 'small' | 'medium'; progress: number[]; mood: Mood; streak: number; nudge: string }

// iOS-style home screen widget. Shows rings and mood only, never pounds.
export default function HomeWidget({ size, progress, mood, streak, nudge }: Props) {
  const streakBadge = (
    <span className='flex items-center gap-1 text-sm font-semibold text-orange'>
      <Flame size={13} /> {streak}
    </span>
  )

  if (size === 'small') {
    return (
      <div className='col-span-2 row-span-2 flex flex-col justify-between rounded-[22px] bg-background p-3.5'>
        <div className='flex items-start justify-between'>
          <Rings progress={progress} size={78} />
          {streakBadge}
        </div>
        <div>
          <MoodChip mood={mood} />
        </div>
      </div>
    )
  }

  return (
    <div className='col-span-4 row-span-2 flex items-center gap-4 rounded-[22px] bg-background p-4'>
      <Rings progress={progress} size={104} />
      <div className='min-w-0 flex-1 space-y-2'>
        <div className='flex items-center justify-between'>
          <MoodChip mood={mood} label={mood === 'Careful' ? 'Careful today' : mood} />
          {streakBadge}
        </div>
        <p className='text-sm leading-snug'>{nudge}</p>
      </div>
    </div>
  )
}
