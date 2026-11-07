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
  expected_shift_income: number
  budget_mode: BudgetMode
  last_weekly_budget: number | null // budget saved on last_budget_date
  budget_ref: number | null // previous day's budget: the anchor for gradual change today
  last_budget_date: string | null
}

export type BudgetMode = 'saver' | 'balanced' | 'relaxed'

// z: buffer safety, alpha: share of expected shift income counted, k: habit multiplier, beta: share of surplus allowed
export const BUDGET_MODES: Record<BudgetMode, { z: number; alpha: number; k: number; beta: number }> = {
  saver: { z: 1.65, alpha: 0, k: 0.9, beta: 0 },
  balanced: { z: 1.28, alpha: 0.5, k: 1.0, beta: 0.25 },
  relaxed: { z: 0.84, alpha: 0.8, k: 1.05, beta: 0.5 },
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
  id?: string
  kind: 'allowance' | 'savings' | 'loan' | 'needs' | 'wants' | 'category'
  label: string
  target?: number
  period: 'day' | 'week' | 'term'
  category?: string
}

export type Mood = 'Comfortable' | 'Careful' | 'Tight'

export type RunwayData = { profile: Profile; transactions: Transaction[]; now?: Date }

// Every ring a user can pick for a custom slot, grouped as in the picker
export const RING_CHOICES: (Ring & { id: string; group: 'Runway' | 'Basic' | 'Categories'; description: string })[] = [
  { id: 'allowance', group: 'Runway', kind: 'allowance', label: "Today's allowance", period: 'day', description: "Stay within today's amount" },
  { id: 'savings', group: 'Runway', kind: 'savings', label: 'Savings', period: 'week', description: 'A small weekly target, e.g. £5' },
  { id: 'loan', group: 'Runway', kind: 'loan', label: 'Make it to the loan', period: 'term', description: 'Runway reaches your next instalment' },
  { id: 'needs', group: 'Basic', kind: 'needs', label: 'Needs', period: 'term', description: 'Food, bills, transport, course' },
  { id: 'wants', group: 'Basic', kind: 'wants', label: 'Wants', period: 'term', description: 'Everything else' },
  { id: 'cat_going_out', group: 'Categories', kind: 'category', category: 'going_out', target: 25, label: 'Going out', period: 'week', description: 'Weekly limit' },
  { id: 'cat_food', group: 'Categories', kind: 'category', category: 'food', target: 40, label: 'Food shop', period: 'week', description: 'Weekly limit' },
  { id: 'cat_takeaways', group: 'Categories', kind: 'category', category: 'takeaways', target: 15, label: 'Takeaways', period: 'week', description: 'Weekly limit' },
  { id: 'cat_course', group: 'Categories', kind: 'category', category: 'course', target: 10, label: 'Course costs', period: 'week', description: 'Weekly limit' },
]

// The stored ring for a picker id (drops the picker-only group/description)
export function ringFromChoice(id: string): Ring | null {
  const c = RING_CHOICES.find((r) => r.id === id)
  return c ? { id: c.id, kind: c.kind, label: c.label, period: c.period, target: c.target, category: c.category } : null
}
const choice = (id: string) => ringFromChoice(id)!

export const RUNWAY_RINGS: Ring[] = ['allowance', 'savings', 'loan'].map(choice)

export const BASIC_RINGS: Ring[] = [
  choice('needs'),
  choice('wants'),
  { id: 'savings_term', kind: 'savings', label: 'Savings', period: 'term' },
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
const WEEK = 7 * DAY
const HALF_LIFE_WEEKS = 3
const PRIOR = { mu: 120, sigma: 40, weeks: 3 } // a typical student, used until we have history
const DELTA = 0.12 // max daily change in the weekly budget

const clamp = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0))
const round1 = (n: number) => Math.round(n * 10) / 10
const sum = (txs: Transaction[]) => txs.reduce((t, x) => t + Number(x.amount), 0)
const time = (t: Transaction) => new Date(t.created_at).getTime()
const startOfDay = (now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

const inLastDays = (txs: Transaction[], days: number, now: Date) =>
  txs.filter((t) => now.getTime() - time(t) < days * DAY)

const spends = (txs: Transaction[]) => txs.filter((t) => t.kind === 'spend')
const discretionary = (txs: Transaction[]) => spends(txs).filter((t) => CATEGORY_GROUP[t.category ?? ''] !== 'needs')

export const gbp = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)

// Exponentially weighted mean/sd of weekly discretionary spend, blended with PRIOR for short histories.
// Weeks end at the start of today, so today's spending joins the habits tomorrow.
export function habits(transactions: Transaction[], now = new Date()) {
  const end = startOfDay(now)
  const past = transactions.filter((t) => time(t) < end)
  const n = past.length ? (end - Math.min(...past.map(time))) / WEEK : 0
  const disc = discretionary(past)

  const totals: number[] = []
  const weights: number[] = []
  for (let i = 0; i < Math.ceil(n); i++) {
    const part = Math.min(1, n - i) // the oldest week may be partial
    if (part < 3 / 7) continue // under 3 days is too noisy to scale up to a week
    const total = sum(disc.filter((t) => time(t) >= end - (i + 1) * WEEK && time(t) < end - i * WEEK))
    totals.push(total / part)
    weights.push(0.5 ** (i / HALF_LIFE_WEEKS) * part)
  }
  const w = weights.reduce((a, b) => a + b, 0)
  const ownMu = w ? totals.reduce((a, x, i) => a + weights[i] * x, 0) / w : 0
  const ownSigma = w ? Math.sqrt(totals.reduce((a, x, i) => a + weights[i] * (x - ownMu) ** 2, 0) / w) : 0

  return {
    mu: (n * ownMu + PRIOR.weeks * PRIOR.mu) / (n + PRIOR.weeks),
    sigma: (n * ownSigma + PRIOR.weeks * PRIOR.sigma) / (n + PRIOR.weeks),
    historyWeeks: n,
  }
}

export function daysUntilLoan(profile: Profile, now = new Date()) {
  if (!profile.next_loan_date) return 0
  const loan = new Date(profile.next_loan_date + 'T00:00:00')
  return Math.max(0, Math.round((loan.getTime() - startOfDay(now)) / DAY))
}

// The budget engine: every step, so the UI can explain it
export function budgetBreakdown(profile: Profile, transactions: Transaction[], now = new Date()) {
  const mode = BUDGET_MODES[profile.budget_mode] ? profile.budget_mode : 'balanced'
  const params = BUDGET_MODES[mode]
  const weeks = Math.max(1, daysUntilLoan(profile, now) / 7)
  const { mu, sigma, historyWeeks } = habits(transactions, now)
  const essentials = Number(profile.essentials_remaining)

  const essentialsWeek = essentials / weeks
  const varianceBuffer = params.z * sigma * Math.sqrt(weeks)
  const buffer = Math.max(varianceBuffer, essentialsWeek)
  const shiftIncome = params.alpha * Number(profile.expected_shift_income ?? 0)
  const spendable = Number(profile.pot) + shiftIncome - essentials - buffer
  const affordable = spendable / weeks
  const usual = params.k * mu
  const target = Math.min(affordable, usual + params.beta * Math.max(0, affordable - usual))

  const ref = profile.budget_ref == null ? null : Number(profile.budget_ref)
  const eased = ref == null ? target : Math.min(Math.max(target, ref * (1 - DELTA)), ref * (1 + DELTA))
  const weeklyBudget = Math.max(0, Math.min(eased, affordable))

  return {
    mode, ...params, weeks, historyWeeks, mu, sigma,
    essentials, essentialsWeek, varianceBuffer, buffer, shiftIncome,
    spendable, affordable, usual, target, ref, weeklyBudget,
    autoSaved: Math.max(0, affordable - weeklyBudget),
  }
}

export type Breakdown = ReturnType<typeof budgetBreakdown>

export function spendable(profile: Profile, transactions: Transaction[], now = new Date()) {
  return budgetBreakdown(profile, transactions, now).spendable
}

export function avgDailySpend(transactions: Transaction[], now = new Date()) {
  return Math.max(1, habits(transactions, now).mu / 7)
}

export function runwayDays(profile: Profile, transactions: Transaction[], now = new Date()) {
  const b = budgetBreakdown(profile, transactions, now)
  return Math.max(0, round1((b.spendable + b.buffer) / avgDailySpend(transactions, now)))
}

export function shortfallDays(profile: Profile, transactions: Transaction[], now = new Date()) {
  return Math.max(0, round1(daysUntilLoan(profile, now) - runwayDays(profile, transactions, now)))
}

export function dailyAllowance(profile: Profile, transactions: Transaction[], now = new Date()) {
  return budgetBreakdown(profile, transactions, now).weeklyBudget / 7
}

// Discretionary spend today (needs come out of essentials, not the allowance).
// shortcut: "today" uses the server's timezone (UTC on Vercel, same as UK in winter)
export function spentToday(transactions: Transaction[], now = new Date()) {
  const today = now.toDateString()
  return sum(discretionary(transactions).filter((t) => new Date(t.created_at).toDateString() === today))
}

export function daysFor(amount: number, transactions: Transaction[], now = new Date()) {
  return round1(amount / avgDailySpend(transactions, now))
}

export function mood({ profile, transactions, now = new Date() }: RunwayData): Mood {
  const allowance = dailyAllowance(profile, transactions, now)
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
      return clamp(1 - spentToday(transactions, now) / dailyAllowance(profile, transactions, now))
    case 'loan':
      return clamp(runwayDays(profile, transactions, now) / Math.max(1, daysUntilLoan(profile, now)))
    case 'savings': {
      const saved = (txs: Transaction[]) => sum(txs.filter((t) => t.kind === 'saving'))
      // Basic mode: share of the term's savings split reached
      if (ring.period === 'term') return clamp(saved(transactions) / ((pot * profile.savings_pct) / 100))
      // Budget left unallocated each week counts as auto-saved
      const auto = budgetBreakdown(profile, transactions, now).autoSaved
      return clamp((saved(week) + auto) / (ring.target ?? Number(profile.weekly_savings_target)))
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
  const budget = budgetBreakdown(profile, transactions, now)
  const allowance = budget.weeklyBudget / 7
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
    budget,
  }
}

export type Summary = ReturnType<typeof summary>

// One-line widget nudge. Never mentions pounds.
export function nudge(s: Summary) {
  if (s.mood === 'Comfortable') return 'Plenty left today. Nice one.'
  if (s.mood === 'Careful') return "Most of today's budget is used. Cheap dinner tonight?"
  if (s.spentToday > s.allowance) return "Over today's budget. Tomorrow's allowance has been lowered a little."
  return 'Running short of your loan. A shift or two would close the gap.'
}
