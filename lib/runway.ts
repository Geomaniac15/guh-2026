// Pure runway maths. No Supabase calls in here.

export type Profile = {
  user_id: string
  pot: number
  essentials_remaining: number
  next_loan_date: string | null
  weekly_savings_target: number
  ring_mode: 'runway' | 'basic' | 'custom'
  rings: Ring[] | null
  needs_pct: number
  wants_pct: number
  savings_pct: number
  streak: number
}

export type Transaction = {
  id?: string
  amount: number
  kind: 'spend' | 'shift' | 'saving'
  category: string | null
  note?: string | null
  created_at: string
}

export type Ring = {
  kind: 'allowance' | 'savings' | 'loan' | 'needs' | 'wants' | 'category'
  label: string
  target?: number
  period: 'day' | 'week' | 'term'
  category?: string
}

export type Mood = 'Comfortable' | 'Careful' | 'Tight'

export type RunwayData = { profile: Profile; transactions: Transaction[]; now?: Date }

export const RUNWAY_RINGS: Ring[] = [
  { kind: 'allowance', label: "Today's allowance", period: 'day' },
  { kind: 'savings', label: 'Savings', period: 'week' },
  { kind: 'loan', label: 'Make it to the loan', period: 'term' },
]

export const BASIC_RINGS: Ring[] = [
  { kind: 'needs', label: 'Needs', period: 'term' },
  { kind: 'wants', label: 'Wants', period: 'term' },
  { kind: 'savings', label: 'Savings', period: 'term' },
]

export const CATEGORY_GROUP: Record<string, 'needs' | 'wants'> = {
  food: 'needs',
  transport: 'needs',
  course: 'needs',
  bills: 'needs',
  going_out: 'wants',
  takeaways: 'wants',
  shopping: 'wants',
  other: 'wants',
}

const DAY = 24 * 60 * 60 * 1000
const clamp = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0))
const round1 = (n: number) => Math.round(n * 10) / 10
const sum = (txs: Transaction[]) => txs.reduce((t, x) => t + Number(x.amount), 0)

const inLastDays = (txs: Transaction[], days: number, now: Date) =>
  txs.filter((t) => now.getTime() - new Date(t.created_at).getTime() < days * DAY)

const spends = (txs: Transaction[]) => txs.filter((t) => t.kind === 'spend')

export const gbp = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)

export function spendable(profile: Profile) {
  return Number(profile.pot) - Number(profile.essentials_remaining)
}

export function avgDailySpend(transactions: Transaction[], now = new Date()) {
  return Math.max(1, sum(spends(inLastDays(transactions, 7, now))) / 7)
}

export function runwayDays(profile: Profile, transactions: Transaction[], now = new Date()) {
  return Math.max(0, round1(spendable(profile) / avgDailySpend(transactions, now)))
}

export function daysUntilLoan(profile: Profile, now = new Date()) {
  if (!profile.next_loan_date) return 0
  const loan = new Date(profile.next_loan_date + 'T00:00:00')
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.round((loan.getTime() - today.getTime()) / DAY))
}

export function shortfallDays(profile: Profile, transactions: Transaction[], now = new Date()) {
  return Math.max(0, round1(daysUntilLoan(profile, now) - runwayDays(profile, transactions, now)))
}

export function dailyAllowance(profile: Profile, now = new Date()) {
  return Math.max(0, spendable(profile) / Math.max(1, daysUntilLoan(profile, now)))
}

// shortcut: "today" uses the server's timezone (UTC on Vercel, same as UK in winter)
export function spentToday(transactions: Transaction[], now = new Date()) {
  const today = now.toDateString()
  return sum(spends(transactions).filter((t) => new Date(t.created_at).toDateString() === today))
}

export function daysFor(amount: number, transactions: Transaction[], now = new Date()) {
  return round1(amount / avgDailySpend(transactions, now))
}

export function mood({ profile, transactions, now = new Date() }: RunwayData): Mood {
  const allowance = dailyAllowance(profile, now)
  const today = spentToday(transactions, now)
  const short = shortfallDays(profile, transactions, now)
  if (today > allowance || short > 7) return 'Tight'
  if (today < allowance * 0.6 && short === 0) return 'Comfortable'
  return 'Careful'
}

export function ringsFor(profile: Profile): Ring[] {
  if (profile.ring_mode === 'basic') return BASIC_RINGS
  if (profile.ring_mode === 'custom' && profile.rings?.length === 3) return profile.rings
  return RUNWAY_RINGS
}

export function ringProgress(ring: Ring, { profile, transactions, now = new Date() }: RunwayData) {
  const week = inLastDays(transactions, 7, now)
  const pot = Number(profile.pot)
  switch (ring.kind) {
    case 'allowance':
      return clamp(1 - spentToday(transactions, now) / dailyAllowance(profile, now))
    case 'loan':
      return clamp(runwayDays(profile, transactions, now) / Math.max(1, daysUntilLoan(profile, now)))
    case 'savings': {
      const saved = (txs: Transaction[]) => sum(txs.filter((t) => t.kind === 'saving'))
      // Basic mode: share of the term's savings split reached
      if (ring.period === 'term') return clamp(saved(transactions) / ((pot * profile.savings_pct) / 100))
      return clamp(saved(week) / (ring.target ?? Number(profile.weekly_savings_target)))
    }
    case 'needs':
    case 'wants': {
      const used = sum(spends(transactions).filter((t) => CATEGORY_GROUP[t.category ?? ''] === ring.kind))
      const pct = ring.kind === 'needs' ? profile.needs_pct : profile.wants_pct
      return clamp(used / ((pot * pct) / 100))
    }
    case 'category':
      return clamp(sum(spends(week).filter((t) => t.category === ring.category)) / (ring.target ?? 25))
  }
}

// Everything a screen needs, computed once
export function summary(profile: Profile, transactions: Transaction[], now = new Date()) {
  const data = { profile, transactions, now }
  const allowance = dailyAllowance(profile, now)
  const today = spentToday(transactions, now)
  return {
    runway: runwayDays(profile, transactions, now),
    untilLoan: daysUntilLoan(profile, now),
    shortfall: shortfallDays(profile, transactions, now),
    allowance,
    spentToday: today,
    leftToday: Math.max(0, allowance - today),
    mood: mood(data),
    rings: ringsFor(profile),
    progress: ringsFor(profile).map((r) => ringProgress(r, data)),
  }
}

export type Summary = ReturnType<typeof summary>
