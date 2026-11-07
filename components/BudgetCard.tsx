import ModePicker from '@/components/ModePicker'
import { gbp, type Breakdown } from '@/lib/runway'

const MODE_RULE = {
  saver: 'Saver: 90% of your usual spending, nothing extra',
  balanced: 'Balanced: your usual spending, plus a quarter of what is spare',
  relaxed: 'Relaxed: a little over your usual spending, plus half of what is spare',
}

const pct = (n: number) => `${Math.round(n * 100)}%`

// Collapsed "How we worked this out" card: each step of the budget engine in plain English
export default function BudgetCard({ b, pot }: { b: Breakdown; pot: number }) {
  const eased = Math.abs(b.weeklyBudget - b.target) > 0.005
  const capped = b.target >= b.affordable - 0.005
  const steps: [string, string][] = [
    [
      `You usually spend ${gbp(b.mu)} a week on non-essentials`,
      b.historyWeeks < 8
        ? `From ${b.historyWeeks.toFixed(1)} weeks of your spending, blended with a typical student's £120 until we know you better.`
        : 'Recent weeks count most.',
    ],
    b.varianceBuffer >= b.essentialsWeek
      ? [`We keep ${gbp(b.buffer)} aside because your spending varies`, `Your weeks swing by about ${gbp(b.sigma)}.`]
      : [`We keep ${gbp(b.buffer)} aside`, 'That is one week of essentials, just in case.'],
    [
      `${gbp(b.spendable)} to last until your loan`,
      `${gbp(pot)} in your pot + ${gbp(b.shiftIncome)} of expected shifts (${pct(b.alpha)} counted) − ${gbp(b.essentials)} essentials − ${gbp(b.buffer)} buffer.`,
    ],
    [
      `You can afford up to ${gbp(b.affordable)} a week to reach your loan`,
      `Spread over ${b.weeks.toFixed(1)} weeks.`,
    ],
    [
      `Aim: ${gbp(b.target)} a week`,
      capped ? 'Capped at what you can afford.' : `${MODE_RULE[b.mode]}.`,
    ],
  ]
  if (eased && b.ref != null) {
    steps.push([
      'We change your budget gradually',
      `At most 12% a day, so it moves from ${gbp(b.ref)} towards ${gbp(b.target)}.`,
    ])
  }

  return (
    <details className='group rounded-2xl bg-card'>
      <summary className='flex cursor-pointer list-none items-center justify-between p-4 font-semibold [&::-webkit-details-marker]:hidden'>
        How we worked this out
        <svg className='transition-transform group-open:rotate-180' width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='#9AA3B2' strokeWidth='2' strokeLinecap='round' aria-hidden>
          <path d='M4 6l4 4 4-4' />
        </svg>
      </summary>
      <div className='space-y-4 px-4 pb-4'>
        <ModePicker mode={b.mode} />
        {b.mu > b.affordable ? (
          <p className='text-sm font-semibold text-pink'>
            You&apos;re spending {gbp(b.mu - b.affordable)} a week more than you can afford
          </p>
        ) : (
          <p className='text-sm font-semibold text-lime'>
            You can afford your habits, and {gbp(b.autoSaved)} a week goes to savings
          </p>
        )}
        <ol className='space-y-3'>
          {steps.map(([title, detail], i) => (
            <li key={i} className='flex gap-3'>
              <span className='mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-line text-xs font-semibold'>
                {i + 1}
              </span>
              <div>
                <p className='text-sm font-medium'>{title}</p>
                <p className='text-xs text-muted'>{detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className='rounded-xl bg-blue/10 p-3'>
          <p className='font-display text-lg font-bold text-blue'>This week&apos;s budget: {gbp(b.weeklyBudget)}</p>
          <p className='text-xs text-muted'>
            {gbp(b.weeklyBudget / 7)} a day
            {b.autoSaved >= 0.5 && ` · ${gbp(b.autoSaved)} a week goes to savings automatically`}
          </p>
        </div>
      </div>
    </details>
  )
}
