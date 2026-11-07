import type { Mood } from '@/lib/runway'

const STYLES: Record<Mood, string> = {
  Comfortable: 'bg-lime/15 text-lime',
  Careful: 'bg-orange/15 text-orange',
  Tight: 'bg-pink/15 text-pink',
}

// Pill showing mood instead of money
export default function MoodChip({ mood, label }: { mood: Mood; label?: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STYLES[mood]}`}>{label ?? mood}</span>
  )
}
