# Runway: how it works

Runway is a budgeting app for UK students. Student money arrives in lumps: a loan instalment three times a year, plus irregular shift pay. Runway puts it all in one pot and measures it in **days of runway**, meaning how long the money lasts at your usual pace, compared with the days until your next loan instalment. Progress is shown as three Activity-style rings, with streaks for motivation. Widgets and lock screens show mood and rings, never pounds.

Live at **https://guh-2026.vercel.app**. Built with Next.js 16 (App Router), Supabase and Tailwind, and deployed from `main` on Vercel.

---

## 1. Pages

| Route | What it shows | Login |
|---|---|---|
| `/dashboard` | **Today.** Mood chip, animated rings (tap them to customise), runway days, a timeline ("7 days short of your loan"), today's allowance and what's left, the streak, a "How we worked this out" card, and the **Add shift** and **Add spend** buttons | Required |
| `/rings` | **Your rings.** Runway / Basic / Custom modes, a live preview, a ring picker and the Needs/Wants/Savings sliders | Required |
| `/night` | **Night out mode.** Set a budget and start. While a night out is running: a big fuel gauge, log spends, end the night | Required |
| `/night/lock` | Full-screen fake iPhone lock screen: a live clock and a small fuel gauge pill. Refreshes every 5 seconds | Required |
| `/widget` | Fake iPhone home screen with small and medium Runway widgets | Required |
| `/locked` | App lock screen ("Runway is locked"). The Face ID and passcode buttons go to `/dashboard` | Required |
| `/login` | Email and password sign up or log in (Supabase Auth) | No |
| `/` | Landing page, still the template | No |

Every page that reads user data does it inside `<Suspense>`, as Next.js 16's Cache Components requires. Each page has a skeleton while loading, an error card if Supabase fails, and a **Load demo data** screen if the user has no profile yet. `proxy.ts` refreshes the session and protects `/dashboard`. The other pages redirect to `/login` themselves.

---

## 2. Endpoints

### Route handlers

| Method and path | Auth | Purpose |
|---|---|---|
| `POST /api/seed` | Logged-in user | Wipes the user's transactions and night outs, and resets their profile to the demo student (see section 8). Called by the **Load demo data** button |
| `GET /api/widget?key=WIDGET_KEY` | Shared key | JSON for the iPhone Scriptable widget (below). Returns `401` with a missing or wrong key |
| `POST /api/test` | Logged-in user | Template leftover that sends a prompt to Claude. Not used by Runway |
| `POST /auth/signout` | Logged-in user | Logs out |

`GET /api/widget` response:

```json
{
  "rings": [0.376, 1, 0.892],
  "mood": "Careful",
  "nudge": "Most of today's budget is used. Cheap dinner tonight?",
  "streak": 5,
  "runwayDays": 57.1,
  "daysUntilLoan": 64
}
```

A phone widget has no login session, so the endpoint signs in as the demo account (`DEMO_EMAIL` / `DEMO_PASSWORD`) with the public anon key. Row Level Security (RLS) still applies, so it can only ever read that one account. We chose this over a Supabase service-role key, which bypasses RLS and could read every user's data if it leaked. The response never includes pound amounts.

### Server actions

All writes go through these. Each one checks the user with `supabase.auth.getClaims()` and validates its input on the server.

| Action | File | What it does |
|---|---|---|
| `addTransaction(formData)` | `app/dashboard/actions.ts` | Logs a shift (place, hours, rate) or a spend (amount, category, note). Updates the pot, and returns before/after runway and allowance for the result screen |
| `setBudgetMode(mode)` | `app/dashboard/actions.ts` | Saver / Balanced / Relaxed. Clears the gradual-change anchor so the new mode applies straight away |
| `startNightOut(budget, keepTaxi, showOnLock)` | `app/night/actions.ts` | Ends any running night out and starts a new one (£1–£500, £8 taxi reserve if ticked) |
| `logNightSpend(amount)` | `app/night/actions.ts` | Calls `addTransaction` as a `going_out` spend, then adds the amount to the night's `spent` |
| `endNightOut()` | `app/night/actions.ts` | Sets `ended_at` |
| `saveRings({ mode, ringIds, split })` | `app/rings/actions.ts` | Saves the ring mode, three custom rings and the Basic split. Rings are rebuilt on the server from `RING_CHOICES`, so a tampered request can't save made-up targets. The split must add up to 100 |

---

## 3. Data model (`supabase/schema.sql`)

All three tables have RLS enabled, with select, insert, update and delete policies limited to `user_id = auth.uid()`.

**`profiles`**, one row per user:

| Column | Meaning |
|---|---|
| `pot` | Current balance (£) |
| `essentials_remaining` | Rent, bills and food still to pay before the loan |
| `next_loan_date` | Date of the next loan instalment |
| `expected_shift_income` | Shift pay still expected before the loan |
| `budget_mode` | `saver` / `balanced` / `relaxed` |
| `last_weekly_budget`, `budget_ref`, `last_budget_date` | Gradual-change bookkeeping (section 4) |
| `weekly_savings_target` | Target for the weekly Savings ring (default £5) |
| `ring_mode`, `rings` | `runway` / `basic` / `custom`, and the three custom rings (JSON) |
| `needs_pct`, `wants_pct`, `savings_pct` | Basic split (default 65/30/5) |
| `streak` | Streak in days. Set by the seed and not yet calculated |

**`transactions`**: `amount` (always positive), `kind` (`spend` / `shift` / `saving`), `category`, `note`, `created_at`.

Categories, and how `CATEGORY_GROUP` groups them:

| Needs | Wants |
|---|---|
| `food`, `transport`, `course`, `bills` | `going_out`, `takeaways`, `shopping`, `other` |

**`night_outs`**: `budget`, `taxi_reserve` (£8 or £0), `spent`, `show_on_lock`, `started_at`, `ended_at` (null while running).

**Setting up a new Supabase project:** run the whole of `schema.sql` once. If your project already has the original tables, run only the "Migration" blocks at the bottom, in order.

---

## 4. The budget engine (`lib/runway.ts`)

This is pure TypeScript with no database calls, and it works in weeks. `budgetBreakdown(profile, transactions)` returns every step below, and the dashboard's "How we worked this out" card shows them in plain English.

1. **Horizon.** `weeks = max(1, daysUntilLoan / 7)`.
2. **Habits.** μ and σ are the exponentially weighted mean and standard deviation of **weekly discretionary spend** (spends outside the needs group), with a half-life of 3 weeks.
   - Weeks end at midnight, so today's spending joins your habits tomorrow. That way a spend today costs exactly its own amount in runway.
   - A partial oldest week is scaled up to a full week. If it has less than 3 days of data it's skipped, because scaling that up is too noisy.
   - **Cold start:** a typical student (£120 ± £40 a week) is blended in as if it were 3 weeks of history:
     `μ = (n·ownμ + 3·120) / (n + 3)` and `σ = (n·ownσ + 3·40) / (n + 3)`, where `n` = weeks of history.
3. **Buffer.** `buffer = max(z · σ · √weeks, essentials_remaining / weeks)`. That's either a cushion for how much your spending varies, or one week of essentials, whichever is bigger.
4. **Spendable.** `spendable = pot + α · expected_shift_income − essentials_remaining − buffer`.
5. **Affordable.** `affordable = spendable / weeks`.
6. **Target.** `target = min(affordable, k·μ + β · max(0, affordable − k·μ))`. This is your habits, plus a share of whatever's spare, but never more than you can afford.
7. **Gradual change.** `weeklyBudget = clamp(target, ref·0.88, ref·1.12)`, then capped at `affordable` and floored at £0. `ref` is the previous day's budget. If there isn't one, the budget is just `target`.

| Mode | z (buffer) | α (shift income counted) | k (habits) | β (share of spare) |
|---|---|---|---|---|
| Saver | 1.65 | 0% | 0.9 | 0 |
| Balanced | 1.28 | 50% | 1.0 | 0.25 |
| Relaxed | 0.84 | 80% | 1.05 | 0.5 |

**Saving once a day.** `loadRunway()` in `lib/data.ts` loads the profile and transactions. On the first load of each day it moves yesterday's budget into `budget_ref`, works out today's budget, and saves it to `last_weekly_budget` with `last_budget_date = today`. Later loads that day use the same `budget_ref`, so the budget can't drift 12% on every page load. The dashboard, rings, night out, widget page, lock screen, widget API and server actions all go through `loadRunway()`.

### Values the screens use

| Value | Formula |
|---|---|
| Daily allowance | `weeklyBudget / 7` |
| Average daily spend | `μ / 7` |
| **Runway days** | `(spendable + buffer) / (μ / 7)`, which is the same as `(pot + α·shifts − essentials) / daily pace` |
| Shortfall | `max(0, daysUntilLoan − runwayDays)` |
| Cost of an amount in days | `daysFor(amount) = amount / (μ / 7)` |
| Spent today | Discretionary spends today only. Needs come out of essentials |
| Auto-saved | `affordable − weeklyBudget`, counted towards the weekly Savings ring |

**Mood** (shown on widgets and lock screens in place of money):
- **Tight** (pink): spent today is over the allowance, or the shortfall is more than 7 days.
- **Comfortable** (lime): spent today is under 60% of the allowance and there's no shortfall.
- **Careful** (orange): anything else.

**Nudge** (the widget's one-liner, never in pounds), by mood:
- Comfortable: "Plenty left today. Nice one."
- Careful: "Most of today's budget is used. Cheap dinner tonight?"
- Tight because of overspending: "Over today's budget…"
- Tight because of the shortfall: "Running short of your loan…"

**The verdict line** in the breakdown card:
- If μ > affordable, in pink: "You're spending £X a week more than you can afford".
- Otherwise, in lime: "You can afford your habits, and £Y a week goes to savings".

---

## 5. Logging money

| What you log | Pot | Other effect |
|---|---|---|
| **Shift** (hours × rate) | + pay | Comes off `expected_shift_income`, since it's one of the shifts we expected, so it isn't counted twice. In Balanced, a £48 shift adds about 1.7 days |
| **Wants spend** (going out, takeaways, shopping, other) | − amount | Runway drops by exactly `daysFor(amount)`. Counts towards today's allowance |
| **Needs spend** (food, transport, course, bills) | − amount | Also comes off `essentials_remaining`, so runway doesn't change. The result screen says "Covered by your essentials" |
| **Night out spend** | − amount | A `going_out` spend, plus it adds to tonight's `spent` |

After a shift or spend, a full-screen result shows "+X days of runway" or "That cost X days", the before → after runway, an updated timeline and the allowance change.

---

## 6. Rings

`Rings.tsx` draws three concentric SVG rings (outer orange, middle lime, inner blue). They fill from empty on load using CSS only.

**Ring modes** (`/rings`):
- **Runway** (default): Today's allowance, Savings and Make it to the loan.
- **Basic**: Needs, Wants and Savings, each as a share of the pot under your split.
- **Custom**: any three from `RING_CHOICES`, grouped as Runway, Basic and Categories.

| Ring kind | Progress (0–1) |
|---|---|
| `allowance` | `1 − spentToday / dailyAllowance`, so it starts full and empties as you spend |
| `savings` (weekly) | `(saved this week + auto-saved) / weekly target` |
| `savings` (Basic, per term) | `saved / (pot × savings_pct)` |
| `loan` | `runwayDays / daysUntilLoan` |
| `needs` / `wants` | `spent in group / (pot × pct)` |
| `category` | `spent in category this week / weekly limit`. Limits: Going out £25, Food shop £40, Takeaways £15, Course costs £10 |

**Basic sliders:** Savings is whatever's left. Dragging Needs or Wants only changes Savings, and dragging Savings only changes Wants. A slider stops when the one it trades with hits 0%, so the total is always 100.

---

## 7. Night out mode

- **Setup:** pick £20, £30, £40 or £50, or type an amount. It shows "Costs X days of runway" (`daysFor`). There are two toggles:
  - **Keep £8 for the taxi home** ring-fences £8. It's never in the gauge and never spendable.
  - **Fuel gauge on lock screen** controls whether `/night/lock` shows the pill.
- **Running:** a large gauge, "£X left of £Y tonight", the taxi reserve note, £4/£6/£10 quick buttons plus "Other amount", **Show lock screen** and **End night out**.
- **Gauge** (`FuelGauge.tsx`): a semicircle from E to F with a needle. It's lime above 25% fuel and pink at or below, and both the fill and needle animate. Fuel = `1 − spent / budget`.
- **Lock screen** (`/night/lock`): a live clock and date in the browser's timezone, and a ~64px gauge with "Night out". It shows no numbers and refreshes every 5 seconds, so the gauge drops live during a demo. Tap the bottom-right circle to get back to `/night`.

---

## 8. Demo data (`POST /api/seed`)

The demo student has a £1,100 pot, £420 of essentials, £720 of expected shift income, a loan on **10 Jan 2027**, Balanced mode and a 5-day streak. They have 3 weeks of realistic history (Tesco meal deals, the bus, Spoons, Deliveroo, ASOS, a gig ticket, one SU bar shift and a £5 saving this week), at about £60–£93 a week of discretionary spending.

On 7 Nov 2026, in Balanced mode:

| Step | Value |
|---|---|
| Usual weekly spend (μ), from 2.9 weeks of history blended with the typical student | £98.57 |
| Variation (σ) | £27.60 |
| Buffer | £106.83 |
| Affordable | £102.07 a week |
| **Weekly budget** | **£99.44** (£14.21 a day) |
| Runway | 73.9 days, against 64 days to the loan: Comfortable |
| Saver / Relaxed budget | about £59 a week (Tight) / about £117 a week |

The numbers change from day to day, because the date and the 7-day windows move.

### Demo script

1. Click **Load demo data** on `/dashboard`.
2. Open "How we worked this out" and switch **Saver → Relaxed** to show the budget and mood changing.
3. **Add spend**: £15 takeaway → "That cost about 1.1 days". **Add shift**: 4h × £12 → "+1.7 days".
4. Tap the rings → `/rings` → Custom → change the middle ring to Going out → Save.
5. Open `/widget` and `/locked` to show that no pounds appear.
6. Open `/night`, choose £30 and **Start night out**. Open `/night/lock` on a second screen, tap £10 twice on the laptop, and watch the gauge drop and turn pink.

---

## 9. iPhone widget (`scriptable/runway-widget.js`)

This is a script for the free **Scriptable** iOS app. It calls `GET /api/widget` and draws the rings (Scriptable has no arc drawing, so they're polylines with round caps), the streak and the mood chip. The medium size adds the nudge. Tapping the widget opens `/dashboard`, and iOS refreshes it about every 15 minutes.

Setup: create a new Scriptable script, paste in the file, then set `APP = 'https://guh-2026.vercel.app'` and `KEY = '<WIDGET_KEY>'`. Add a Scriptable widget to the home screen and pick the script. **Don't commit a real key.** The repo copy keeps the placeholder.

---

## 10. Environment variables

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everything (public by design) |
| `WIDGET_KEY` | `/api/widget` shared secret |
| `DEMO_EMAIL`, `DEMO_PASSWORD` | `/api/widget` signs in as this account |
| `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `FIRECRAWL_API_KEY` | Template helpers (`lib/ai.ts`, `lib/voice.ts`). Not used by Runway yet |

Set them in `.env.local` and in Vercel, and restart `npm run dev` after changing them.

---

## 11. Known limitations

- **"Today" uses the server's timezone** (UTC on Vercel). That's the same as UK time until the clocks change in March.
- **The streak is a seeded number**, not calculated from closed rings.
- **Face ID on `/locked` is fake**: both buttons just go to `/dashboard`. Real passkeys were a stretch goal.
- **Category ring limits are fixed** and can't be edited in the app.
- **Ring direction is mixed:** the allowance ring empties as you spend, while category, Needs and Wants rings fill as you spend.
- **The widget API signs in on every request.** That's fine for a widget, but Supabase may rate-limit it if it's hit dozens of times a minute.
- **"Can I afford it?" (voice Q&A, Phase 6) was not built.** `/api/test` and `components/AskClaude.tsx` are unused template leftovers.

---

## 12. File map

```
app/
  dashboard/page.tsx     Today screen
  dashboard/actions.ts   addTransaction, setBudgetMode
  rings/                 /rings page + saveRings
  night/                 /night page, actions, lock/ screen
  widget/page.tsx        fake home screen
  locked/page.tsx        app lock screen
  api/seed/route.ts      demo data
  api/widget/route.ts    widget JSON
components/
  Rings, Timeline, MoodChip, Flame          shared visuals
  AddActions, AddForm, AddResultView        add shift/spend flow
  BudgetCard, ModePicker                    "How we worked this out"
  RingsEditor, RingPicker, SplitSliders     /rings
  FuelGauge, NightSetup, NightActive        night out
  LockClock, AutoRefresh                    lock screen helpers
  HomeWidget, LoadDemoButton
lib/
  runway.ts      budget engine, rings, mood (pure)
  data.ts        loadRunway (+ daily budget save), loadActiveNight
  supabase/      browser + server clients
scriptable/runway-widget.js   iPhone widget
supabase/schema.sql           tables, RLS, migrations
docs/RUNWAY.md                this file
```
