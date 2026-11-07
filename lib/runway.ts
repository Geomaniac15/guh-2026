// Pure runway maths. No Supabase calls in here.

export type Profile = {
  user_id: string
  pot: number
  essentials_remaining: number
  next_loan_date: string | null
  weekly_savings_target: number
  gauge_category?: string | null // the user-picked 4th gauge
  gauge_limit?: number | null // its weekly limit (£)
  needs_pct: number
  wants_pct: number
  savings_pct: number
  streak: number
  expected_shift_income: number
  budget_mode: BudgetMode
  last_weekly_budget: number | null // budget saved on last_budget_date
  budget_ref: number | null // previous day's budget: the anchor for gradual change today
  last_budget_date: string | null
  bank_connected_at?: string | null
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
  merchant?: string | null // bank feed description, e.g. 'NANDOS MANCHESTER'
  ai_categorised?: boolean
  source?: 'manual' | 'bank'
  created_at: string
}

export type Mood = 'Comfortable' | 'Careful' | 'Tight'

export type RunwayData = { profile: Profile; transactions: Transaction[]; now?: Date }

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

export const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food shop',
  transport: 'Transport',
  course: 'Course costs',
  bills: 'Bills',
  going_out: 'Going out',
  takeaways: 'Takeaways',
  shopping: 'Shopping',
  other: 'Other',
}

// Default weekly limit for each category's gauge
export const CATEGORY_LIMITS: Record<string, number> = {
  food: 40,
  transport: 15,
  course: 10,
  bills: 30,
  going_out: 25,
  takeaways: 15,
  shopping: 20,
  other: 15,
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

// Monday 00:00 of this week (server timezone)
export function weekStart(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return d.getTime() - ((d.getDay() + 6) % 7) * DAY
}

export type GaugeReading = {
  fill: number // fuel left this week, 1 = full (F), 0 = empty (E)
  pace: number // where the needle should be today if spending evenly (the triangle)
  status: 'On track' | 'Too fast'
  spent: number
  budget: number
}

// Weekly fuel gauges. Needs budget = essentials at the start of the week ÷ weeks to loan;
// Wants budget = this week's budget from the engine; Total = both in one tank.
export function gauges(profile: Profile, transactions: Transaction[], now = new Date()) {
  const b = budgetBreakdown(profile, transactions, now)
  const start = weekStart(now)
  const pace = clamp(1 - (now.getTime() - start) / WEEK)
  const thisWeek = transactions.filter((t) => time(t) >= start && time(t) <= now.getTime())
  const weekSpends = spends(thisWeek)
  const isNeeds = (t: Transaction) => CATEGORY_GROUP[t.category ?? ''] === 'needs'

  const reading = (spent: number, budget: number): GaugeReading => {
    const fill = budget > 0 ? clamp(1 - spent / budget) : spent > 0 ? 0 : 1
    return { fill, pace, status: fill >= pace - 0.05 ? 'On track' : 'Too fast', spent, budget }
  }

  const needsSpent = sum(weekSpends.filter(isNeeds))
  const wantsSpent = sum(weekSpends.filter((t) => !isNeeds(t)))
  const needsBudget = (b.essentials + needsSpent) / b.weeks
  const wantsBudget = b.weeklyBudget

  const category = profile.gauge_category && CATEGORY_LIMITS[profile.gauge_category] ? profile.gauge_category : 'going_out'
  const limit = Number(profile.gauge_limit) > 0 ? Number(profile.gauge_limit) : CATEGORY_LIMITS[category]
  const target = Number(profile.weekly_savings_target) || 5
  const saved = sum(thisWeek.filter((t) => t.kind === 'saving')) + b.autoSaved // underspend counts as saved

  return {
    pace,
    needs: reading(needsSpent, needsBudget),
    wants: reading(wantsSpent, wantsBudget),
    total: reading(needsSpent + wantsSpent, needsBudget + wantsBudget),
    category: { ...reading(sum(weekSpends.filter((t) => t.category === category)), limit), category, label: CATEGORY_LABELS[category], limit },
    savings: { fill: clamp(saved / target), target, saved },
  }
}

export type Gauges = ReturnType<typeof gauges>

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
    gauges: gauges(profile, transactions, now),
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

export type Impact = { type: 'cost' | 'gain' | 'covered' | 'saving'; days: number }

// What a transaction does to runway, at your usual pace.
// Wants spends cost amount / pace. Needs come out of essentials (no runway change while essentials remain).
// Shift pay replaces expected shift income, so only the part not already counted (1 − α) is new runway.
export function transactionImpact(tx: Transaction, profile: Profile, transactions: Transaction[], now = new Date()): Impact {
  const pace = avgDailySpend(transactions, now)
  const amount = Number(tx.amount)
  if (tx.kind === 'saving') return { type: 'saving', days: 0 }
  if (tx.kind === 'shift') {
    const { alpha } = budgetBreakdown(profile, transactions, now)
    return { type: 'gain', days: round1((amount * (1 - alpha)) / pace) }
  }
  if (CATEGORY_GROUP[tx.category ?? ''] === 'needs' && Number(profile.essentials_remaining) > 0) return { type: 'covered', days: 0 }
  return { type: 'cost', days: round1(amount / pace) }
}

export function impactText(i: Impact) {
  if (i.type === 'saving') return 'Moved to savings'
  if (i.type === 'covered') return 'Covered by your essentials'
  if (i.type === 'gain') return `+${i.days.toFixed(1)} days of range`
  return `Cost ${i.days.toFixed(1)} days of range`
}
