# Odo: how it works

Odo (previously called Runway) is a budgeting app for UK students. Student money arrives in lumps: a loan instalment three times a year, plus irregular shift pay. Odo puts it all in one pot and treats it like fuel in a car:

- **Range** is how many days your money lasts at your usual pace. It's shown against the days until your next loan instalment ("8 days short" or "6 days to spare").
- **Fuel gauges** show how much of this week's budget is left for Needs, Wants and Total, plus one category you pick. A triangle on each dial shows where the needle should be today.
- **The bank feed fills itself in.** Transactions from the bank are sorted into categories automatically, using a merchant list or a small AI model (Qwen). If you fix a category once, Odo remembers it for that shop.

Widgets and lock screens show gauges and days, never pounds.

Live at **https://guh-2026.vercel.app**. Built with Next.js 16 (App Router), Supabase and Tailwind, and deployed from `main` on Vercel.

> The code still uses the old name in places (`lib/runway.ts`, `loadRunway()`, `runwayDays`, `scriptable/runway-widget.js`). In the app and on slides, "runway" is now **range**.

---

## 0. The pitch in one page (for the slides)

**Problem.** A student loan lands as one big lump, maybe £1,500 for the whole term. It feels like a lot, so it goes fast, and by week 8 students are skipping meals. Normal budgeting apps think in months and salaries, which doesn't fit someone with one lump of money and a few bar shifts.

**Idea.** Measure money in **days of range**, like a car's fuel range. "Will I make it to the next loan?" is the only question that matters, so it's the main number on the screen.

**What it does:**

| Feature | One line for a slide |
|---|---|
| Range | "57 days of range, 64 days to your loan: 7 days short", drawn as a road with a car and a finish flag |
| Fuel gauges | Needs / Total / Wants dials and a savings bar. The triangle shows where you should be today, so behind it means you're going too fast |
| Every spend costs days | "That Deliveroo cost 1.1 days." "Your shift added 1.7 days." |
| Automatic bank feed | Transactions arrive by themselves and get sorted by category. AI handles shops it hasn't seen before |
| Learns your corrections | Fix "Costa" from Other to Takeaways once, and every future Costa is a Takeaway |
| Smart weekly budget | Learns your habits, keeps a safety buffer, and never jumps more than 12% a day. There are three styles: Saver, Balanced and Relaxed |
| Night out mode | Set a budget for tonight, keep £8 aside for the taxi home, and a fuel gauge drains as you buy rounds |
| Privacy | Widgets and lock screens show gauges only, never amounts. A Face ID lock covers the app |
| Home screen | Installs as an iPhone web app, with real iOS widgets through Scriptable |

**Why it's different:**
- It thinks in days until the loan, not monthly budgets.
- It needs no manual logging, because the bank feed and AI categorisation do it.
- It's private by design: no pounds appear on any glanceable surface.
- The AI runs on a small open model (Qwen 2.5, 1.5B parameters) through Ollama, so merchant names never go to a big cloud AI. Most shops are matched instantly by rules, and AI is only used for unknown ones.

**Tech:** Next.js 16, Supabase (Postgres, Auth and Row Level Security), Tailwind, Vercel, Ollama with Qwen 2.5, WebAuthn (Face ID) and Scriptable (iOS widgets).

---

## 1. Pages

The bottom tab bar has four tabs: **Today**, **Gauges**, **Night out** and **Bank**. It's hidden on the lock screens, the login page and the landing page.

| Route | What it shows | Login |
|---|---|---|
| `/` | Landing page: three gauges, "Your loan, counted in days", and **Try the demo** / **Log in** | No |
| `/dashboard` | **Today.** Behind the Face ID lock. Mood chip, ⋯ menu, gauge cluster (tap it to customise), range card, today's allowance and what's left, "How we worked this out", the streak, a **Demo Bank · live** pill and **Latest transactions** | Required |
| `/rings` | **Your gauges** (the old URL is kept). Live preview, the fourth gauge's category and weekly limit, and the budget style (Saver / Balanced / Relaxed) | Required |
| `/night` | **Night out mode.** Set a budget and start. While a night out is running: a big fuel gauge, log spends, end the night | Required |
| `/night/lock` | Full-screen "road trip" iPhone lock screen: clock, total gauge, a range road with mood, and the night out card. Refreshes every 5 seconds | Required |
| `/connect` | **Bank.** Demo Bank connection status, Connect / Reconnect, and a link to the simulator | Required |
| `/connect/simulate` | Push one Demo Bank transaction now (SU bar payroll, Nandos, Tesco, Uber) | Required |
| `/widget` | Widget gallery: the range widget, four small gauge widgets (Needs, Wants, your category, and a savings jerry can), plus medium and large | Required |
| `/locked` | App lock: total gauge and mood, then **Set up Face ID** / **Unlock with Face ID** / **Use passcode** | Required |
| `/login` | Email and password sign up or log in (Supabase Auth) | No |

**The ⋯ menu** on Today has: Add cash (a manual spend), Lock app, Widget preview, Lock screen, Simulate bank transaction, Load demo data and Log out.

Every page that reads user data does it inside `<Suspense>`, as Next.js 16's Cache Components requires. Each page has a skeleton while loading, an error card if Supabase fails, and a **Load demo data** screen if the user has no profile yet. `proxy.ts` refreshes the session and protects `/dashboard`. The other pages redirect to `/login` themselves.

---

## 2. Endpoints

### Route handlers

| Method and path | Auth | Purpose |
|---|---|---|
| `POST /api/seed` | Logged-in user | Wipes the user's transactions, night outs and learned merchant rules, resets their profile to the demo student and marks Demo Bank as connected (section 9) |
| `POST /api/categorise` `{ merchant }` | Logged-in user | Returns `{ category, source: 'rule' \| 'map' \| 'ai' \| 'fallback', ai }` |
| `GET /api/categorise/health` | Logged-in user | Sends "DELIVEROO" straight to Qwen and returns `{ engine: 'qwen' \| 'unavailable', model, latencyMs }`. Use it to check the tunnel before a demo |
| `GET /api/widget?key=WIDGET_KEY` | Shared key | JSON for the Scriptable widget. Returns `401` with a missing or wrong key |
| `POST /api/test` | Logged-in user | Template leftover that sends a prompt to Claude. Not used by Odo |
| `POST /auth/signout` | Logged-in user | Logs out |

`GET /api/widget` response (no pound amounts):

```json
{
  "gauges": {
    "pace": 0.5,
    "total":    { "fill": 0.61, "status": "On track" },
    "needs":    { "fill": 0.8, "status": "On track" },
    "wants":    { "fill": 0.38, "status": "Too fast" },
    "category": { "label": "Going out", "fill": 0.3, "status": "Too fast" },
    "savings": 1
  },
  "shortfallDays": 0,
  "mood": "Comfortable",
  "nudge": "Plenty left today. Nice one.",
  "streak": 5,
  "runwayDays": 73.9,
  "daysUntilLoan": 64
}
```

A phone widget has no login session, so the endpoint signs in as the demo account (`DEMO_EMAIL` / `DEMO_PASSWORD`) with the public anon key. Row Level Security (RLS) still applies, so it can only ever read that one account. We chose this over a Supabase service-role key, which bypasses RLS and could read every user's data if it leaked.

### Server actions

All writes go through these. Each one checks the user with `supabase.auth.getClaims()` and validates its input on the server. Every new transaction (manual, night out or bank) goes through one shared function, `recordTransaction()` in `lib/record.ts`, so the money logic exists only once.

| Action | File | What it does |
|---|---|---|
| `addTransaction(formData)` | `app/dashboard/actions.ts` | Manual cash entry: a spend (amount, category, note) or a shift (hours × rate). Returns before/after range for the result screen |
| `correctCategory(id, category)` | `app/dashboard/actions.ts` | Fixes a spend's category, moves the money between essentials and wants if the group changed, and saves a merchant → category rule for the future |
| `setBudgetMode(mode)` | `app/dashboard/actions.ts` | Saver / Balanced / Relaxed. Clears the gradual-change anchor so the new mode applies straight away |
| `connectBank()` | `app/connect/actions.ts` | Sets `bank_connected_at` |
| `syncBank()` | `app/connect/actions.ts` | Called by Today every 20 seconds. Sends the next transaction from the Demo Bank queue, at most one every 15 seconds even with several tabs open |
| `simulateBankTransaction(id)` | `app/connect/actions.ts` | Sends one chosen Demo Bank transaction now |
| `saveGauge(category, limit)` | `app/rings/actions.ts` | Saves the fourth gauge's category and weekly limit (£1–£1,000) |
| `startNightOut(budget, keepTaxi, showOnLock)` | `app/night/actions.ts` | Ends any running night out and starts a new one (£1–£500, with an £8 taxi reserve if ticked) |
| `logNightSpend(amount)` | `app/night/actions.ts` | Records a `going_out` spend, then adds the amount to the night's `spent` |
| `endNightOut()` | `app/night/actions.ts` | Sets `ended_at` |

---

## 3. Data model (`supabase/schema.sql`)

All four tables have RLS enabled, with select, insert, update and delete policies limited to `user_id = auth.uid()`.

**`profiles`**, one row per user:

| Column | Meaning |
|---|---|
| `pot` | Current balance (£) |
| `essentials_remaining` | Rent, bills and food still to pay before the loan |
| `next_loan_date` | Date of the next loan instalment |
| `expected_shift_income` | Shift pay still expected before the loan |
| `budget_mode` | `saver` / `balanced` / `relaxed` |
| `last_weekly_budget`, `budget_ref`, `last_budget_date` | Gradual-change bookkeeping (section 4) |
| `weekly_savings_target` | Target for the weekly savings gauge (default £5) |
| `gauge_category`, `gauge_limit` | The fourth gauge (default Going out, £25 a week) |
| `bank_connected_at` | When Demo Bank was connected. Null means not connected |
| `streak` | Streak in days. Set by the seed and not yet calculated |
| `ring_mode`, `rings`, `needs_pct`, `wants_pct`, `savings_pct` | Left over from the old rings and no longer used |

**`transactions`**: `amount` (always positive), `kind` (`spend` / `shift` / `saving`), `category`, `note`, `merchant` (the bank's description, e.g. `NANDOS MANCHESTER`), `ai_categorised`, `source` (`manual` / `bank`) and `created_at`.

Categories, and how `CATEGORY_GROUP` groups them:

| Needs | Wants |
|---|---|
| `food` (Food shop), `transport`, `course` (Course costs), `bills` | `going_out`, `takeaways`, `shopping`, `other` |

**`user_merchant_rules`**: `merchant` (normalised to upper case) and `category`, with one row per user and merchant. These are the "remember this shop" corrections.

**`night_outs`**: `budget`, `taxi_reserve` (£8 or £0), `spent`, `show_on_lock`, `started_at`, `ended_at` (null while running).

**Setting up a new Supabase project:** run the whole of `schema.sql` once. If your project already has the original tables, run only the "Migration" blocks at the bottom, in order.

---

## 4. The budget engine (`lib/runway.ts`)

This is pure TypeScript with no database calls, and it works in weeks. `budgetBreakdown(profile, transactions)` returns every step below, and the dashboard's "How we worked this out" card shows them in plain English.

1. **Horizon.** `weeks = max(1, daysUntilLoan / 7)`.
2. **Habits.** μ and σ are the exponentially weighted mean and standard deviation of **weekly discretionary spend** (spends outside the needs group), with a half-life of 3 weeks.
   - Weeks end at midnight, so today's spending joins your habits tomorrow. That way a spend today costs exactly its own amount in range.
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

**Saving once a day.** `loadRunway()` in `lib/data.ts` loads the profile and transactions. On the first load of each day it moves yesterday's budget into `budget_ref`, works out today's budget, and saves it to `last_weekly_budget` with `last_budget_date = today`. Later loads that day use the same `budget_ref`, so the budget can't drift 12% on every page load. Every screen, the widget API and the server actions all go through `loadRunway()`.

### Values the screens use

| Value | Formula |
|---|---|
| Daily allowance | `weeklyBudget / 7` |
| Average daily spend (pace) | `μ / 7` |
| **Range (days)** | `(spendable + buffer) / (μ / 7)`, which is the same as `(pot + α·shifts − essentials) / daily pace` |
| Shortfall | `max(0, daysUntilLoan − range)` |
| Cost of an amount in days | `daysFor(amount) = amount / (μ / 7)` |
| Spent today | Discretionary spends today only. Needs come out of essentials |
| Auto-saved | `affordable − weeklyBudget`, which counts towards the savings gauge |

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

## 5. Fuel gauges (`gauges()` in `lib/runway.ts`)

These replaced the old Activity-style rings. Each gauge is a car fuel dial (`components/Gauge.tsx`): E at the bottom left, F at the bottom right, and a pink reserve zone at E. The needle sweeps up from E when the page loads. No numbers are drawn on the dial.

- **Fill** = fuel left this week, `1 − spent / budget`. Weeks start on **Monday at 00:00**.
- **Pace triangle** = where the needle should be today if you spread spending evenly: `1 − (time since Monday / 7 days)`. On Thursday at midnight it's at about 57%.
- **Status:** "On track" if `fill ≥ pace − 5%`, otherwise "Too fast".

| Gauge | Colour | Weekly budget | Spent |
|---|---|---|---|
| **Needs** | Blue | `(essentials_remaining + needs spent this week) / weeks` | Needs-group spends this week |
| **Wants** | Orange | `weeklyBudget` from the engine | Wants-group spends this week |
| **Total** | White (big centre dial) | Needs + Wants budgets in one tank | Both |
| **Your category** (the fourth gauge) | Pink | `gauge_limit` (defaults: Food £40, Bills £30, Going out £25, Shopping £20, Transport, Takeaways and Other £15, Course £10) | That category this week |
| **Savings** (bar or jerry can) | Lime | `weekly_savings_target` (£5) | `(savings this week + auto-saved) / target` |

Total can be on pace while Wants is behind, because Needs is ahead. The `/widget` page explains this in a "Why a total gauge" card.

**Where they appear:** the Today cluster (Needs | Total | Wants plus the savings bar), the `/rings` editor preview, the small, medium and large widgets, the `/locked` screen (Total only) and the `/night/lock` screen (Total only).

**Range road** (`RangeRoad.tsx`): a car at today and a flag on loan day. A lime line shows how far the money lasts, and pink dashes show the gap. `RangeCard` adds "Range 57 days · Loan day 10 Jan · 7 days short / 6 days to spare".

---

## 6. Bank feed and AI categorisation

**Demo Bank** is a simulated bank. Once it's connected (Load demo data connects it automatically), the Today screen calls `syncBank()` every 20 seconds and a new transaction arrives with a toast like this:

> NANDOS MANCHESTER −£15.00 · Going out · −1.1 days

The queue loops through: Nandos, Tesco, Costa, Uber, SU bar payroll (+£48 shift), Deliveroo, Waterstones, Greggs, Sainsbury's, Spoons. It only runs while Today is on screen and the tab is visible, and the **Demo Bank · live** pill pauses it. `/connect/simulate` sends Payroll, Nandos, Tesco or Uber on demand.

**How a merchant gets a category** (`lib/categorise.ts`). The first match wins:

1. **Your rules.** If you corrected this shop before, use your choice (`user_merchant_rules`).
2. **Merchant map.** About 20 common UK names, matched on a substring: Tesco, Sainsbury, Aldi and Lidl are Food. Uber is Transport, but Uber Eats is Takeaways. Deliveroo and Greggs are Takeaways. Wetherspoon is Going out. ASOS, Amazon and Primark are Shopping. Spotify and Netflix are Bills.
3. **Qwen 2.5 (1.5B) via Ollama.** It runs locally or through a Cloudflare tunnel (`OLLAMA_URL`), with temperature 0. A JSON schema forces the reply to be one of the 8 categories, so it can't invent one. There's an 8-second timeout.
4. **Fallback:** `other`, if Qwen can't be reached.

In the demo queue, **Costa, Waterstones and Nandos** go to the AI. The others are matched by the map. AI-picked transactions show a blue **AI** badge.

**Latest transactions** (Today): the 10 newest. Each shows the merchant, a category chip, the AI badge, the time and its effect in days ("−1.1 days", "+1.7 days" or "Essentials"). Tapping one opens a detail sheet with the full date, amount, effect and a category picker. Picking a category:
- updates the transaction,
- moves the money between essentials and wants if it changed group (Need ↔ Want), and
- saves a rule so the next transaction from that shop is categorised your way, without AI.

**The effect in days** (`transactionImpact`):

| Transaction | Effect |
|---|---|
| Wants spend | Costs `amount / pace` days |
| Needs spend, while essentials remain | "Covered by your essentials", with no change to range |
| Shift pay | `amount × (1 − α) / pace` extra days. Part of it was already counted as expected shift income |
| Saving | "Moved to savings" |

---

## 7. Logging money

Most money now arrives through the bank feed. Manual entry is still there for cash, through **⋯ → Add cash**.

| What comes in | Pot | Other effect |
|---|---|---|
| **Shift / payroll** | + pay | Comes off `expected_shift_income`, since it's one of the shifts we expected, so it isn't counted twice. In Balanced, a £48 shift adds about 1.7 days |
| **Wants spend** | − amount | Range drops by exactly `daysFor(amount)`. Counts towards today's allowance and the Wants gauge |
| **Needs spend** | − amount | Also comes off `essentials_remaining`, so range doesn't change. Counts towards the Needs gauge |
| **Night out spend** | − amount | A `going_out` spend, plus it adds to tonight's `spent` |

After a manual entry, a full-screen result shows "+X days of range" or "That cost X days", the before → after range, and the allowance change.

---

## 8. Night out mode, lock screens and Face ID

**Night out:**
- **Setup:** pick £20, £30, £40 or £50, or type an amount. It shows "Costs X days of range". There are two toggles:
  - **Keep £8 for the taxi home** ring-fences £8. It's never in the gauge and never spendable.
  - **Fuel gauge on lock screen** controls whether the night out card appears on `/night/lock`.
- **Running:** a large gauge, "£X left of £Y tonight", the taxi reserve note, £4/£6/£10 quick buttons plus "Other amount", **Show lock screen** and **End night out**. The gauge is lime above 25% and pink at or below.

**Road trip lock screen** (`/night/lock`): a perspective road drawn in SVG, a live clock, a round total gauge widget, a "Range" widget with mood and the road, and the night out card ("Fuel for tonight · taxi home kept aside"). It shows no amounts and refreshes every 5 seconds, so the gauge drops live during a demo. Tap "Tap to unlock" to go to `/locked`.

**Face ID app lock:**
- Today is wrapped in `LockGate`. If the app hasn't been unlocked in this session, it sends you to `/locked`.
- `/locked` uses **WebAuthn** with the phone's built-in authenticator: **Set up Face ID** the first time, then **Unlock with Face ID**. **Use passcode** always works, and a plain **Unlock** appears if the browser has no Face ID.
- The unlock flag is in `sessionStorage`, so closing the app locks it again. **⋯ → Lock app** locks it on demand.
- This is a privacy screen, not security. The data itself is protected by Supabase login and RLS (see section 12).

---

## 9. Demo data (`POST /api/seed`)

The demo student has a £1,100 pot, £420 of essentials, £720 of expected shift income, a loan on **10 Jan 2027**, Balanced mode, a 5-day streak, Going out (£25 a week) as the fourth gauge, and **Demo Bank already connected**. They have 3 weeks of realistic history (Tesco meal deals, the bus, Spoons, Deliveroo, ASOS, a gig ticket, one SU bar shift and a £5 saving this week), at about £60–£93 a week of discretionary spending.

On 7 Nov 2026, in Balanced mode, straight after loading:

| Step | Value |
|---|---|
| Usual weekly spend (μ), from 2.9 weeks of history blended with the typical student | £98.57 |
| Variation (σ) | £27.60 |
| Buffer | £106.83 |
| Affordable | £102.07 a week |
| **Weekly budget** | **£99.44** (£14.21 a day) |
| Range | 73.9 days, against 64 days to the loan: Comfortable |
| Saver / Relaxed budget | about £59 a week (Tight) / about £117 a week |

The numbers change from day to day, because the date and the 7-day windows move. They also change as soon as the live bank feed starts adding transactions.

### Demo script

1. Open the app (from the home screen if it's installed). `/locked` appears: **Unlock with Face ID**.
2. **⋯ → Load demo data.** Point out the gauges, the triangle ("this is where you should be today") and the range road.
3. Wait about 20 seconds. A **Nandos** transaction slides in: "AI · Going out · −1.1 days". Then Tesco: "Covered by essentials".
4. Tap an AI transaction (e.g. **Costa**), change it to Takeaways, and explain that Odo now remembers it. Next time Costa comes in without the AI badge.
5. Open "How we worked this out" and switch **Saver → Relaxed** to show the Wants gauge and mood changing.
6. **Gauges tab:** change the fourth gauge to Takeaways (£15) and save.
7. **⋯ → Widget preview** and **Lock screen** to show that no pounds appear.
8. **Night out tab:** choose £30, keep the taxi £8, and **Start night out**. Open `/night/lock` on a second screen, tap £10 twice on the laptop, and watch the gauge drop and turn pink.

Before the demo: open `/api/categorise/health` while logged in. If it says `"engine": "unavailable"`, the Qwen tunnel is down and AI shops will show as "Other" (the demo still works).

---

## 10. iPhone widget (`scriptable/runway-widget.js`)

This is a script for the free **Scriptable** iOS app. It calls `GET /api/widget` and draws the same fuel gauges (Scriptable has no arc drawing, so arcs are drawn as polylines):
- **Small:** the total gauge, the streak and the mood chip.
- **Medium:** mood, streak, the Needs | Total | Wants cluster and the savings bar.
- **Large:** adds the range road ("57 days · 7 short") at the top and the nudge at the bottom.

Tapping the widget opens `/dashboard`, and iOS refreshes it about every 15 minutes.

Setup: create a new Scriptable script, paste in the file, then set `APP = 'https://guh-2026.vercel.app'` and `KEY = '<WIDGET_KEY>'`. Add a Scriptable widget to the home screen and pick the script. **Don't commit a real key.** The repo copy keeps the placeholder.

The app also installs as a home-screen web app (`app/manifest.ts`, Apple web app meta tags): Share → Add to Home Screen opens Odo full screen at `/dashboard`.

---

## 11. Environment variables

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everything (public by design) |
| `WIDGET_KEY` | `/api/widget` shared secret |
| `DEMO_EMAIL`, `DEMO_PASSWORD` | `/api/widget` signs in as this account |
| `OLLAMA_URL` | Ollama base URL, local or a tunnel such as `https://xyz.trycloudflare.com`. A trailing `/`, `/v1` or `/api` is fine |
| `OLLAMA_MODEL` | Default `qwen2.5:1.5b` |
| `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `FIRECRAWL_API_KEY` | Template helpers (`lib/ai.ts`, `lib/voice.ts`). Not used by Odo |

Set them in `.env.local` and in Vercel, and restart `npm run dev` after changing them.

---

## 12. Known limitations

- **Demo Bank is simulated.** It's a fixed queue of 10 transactions, not Open Banking.
- **AI needs the Ollama tunnel.** If it's down, unknown shops fall back to "Other", but the map and your rules still work.
- **Face ID is a privacy screen, not real security.** The WebAuthn result is checked in the browser only, and the unlock flag is in `sessionStorage`. The real protection is Supabase login and RLS.
- **"Today" and "this week" use the server's timezone** (UTC on Vercel). That's the same as UK time until the clocks change in March.
- **The streak is a seeded number**, not calculated.
- **Changing a category between Need and Want** can restore slightly too much to essentials if essentials had already reached £0.
- **The widget API signs in on every request.** That's fine for a widget, but Supabase may rate-limit it if it's hit dozens of times a minute.
- **"Can I afford it?" (voice Q&A) was not built.** `/api/test` and `components/AskClaude.tsx` are unused template leftovers.

---

## 13. File map

```
app/
  page.tsx               landing page
  dashboard/page.tsx     Today screen
  dashboard/actions.ts   addTransaction, correctCategory, setBudgetMode
  rings/                 Your gauges page + saveGauge
  night/                 night out page, actions, lock/ road trip lock screen
  connect/               Bank page, connect/sync/simulate actions, simulate/ page
  widget/page.tsx        widget gallery
  locked/page.tsx        Face ID app lock
  manifest.ts            home screen web app
  api/seed/              demo data
  api/widget/            widget JSON
  api/categorise/        categorise a merchant + /health
components/
  Gauge, GaugeCluster, GaugeTile, JerryCan    fuel gauges
  RangeCard, RangeRoad                        range and the road
  BankFeed, SyncedToast, SimulateBank, ConnectButton, TransactionList   bank feed
  DashboardMenu, AddForm, AddResultView       ⋯ menu and cash entry
  BudgetCard, ModePicker, MoodChip, Flame     Today
  GaugesEditor                                /rings
  FuelGauge, NightSetup, NightActive          night out
  LockGate, FaceIdUnlock, LockClock, AutoRefresh   locks
  TabBar, LoadDemoButton
lib/
  runway.ts      budget engine, gauges, mood, effect in days (pure)
  data.ts        loadRunway (+ daily budget save), loadActiveNight
  record.ts      recordTransaction: the one place money changes
  categorise.ts  rules → merchant map → Qwen → other
  appLock.ts     Face ID / session unlock helpers
  supabase/      browser + server clients
scriptable/runway-widget.js   iPhone widget
supabase/schema.sql           tables, RLS, migrations
docs/RUNWAY.md                this file
```
