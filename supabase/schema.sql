-- Runway schema. Paste into the Supabase SQL editor and run once.

create table if not exists profiles (
  user_id uuid primary key references auth.users on delete cascade,
  pot numeric not null default 0,
  essentials_remaining numeric not null default 0,
  next_loan_date date,
  weekly_savings_target numeric default 5,
  ring_mode text default 'runway' check (ring_mode in ('runway', 'basic', 'custom')),
  rings jsonb,
  needs_pct int default 65,
  wants_pct int default 30,
  savings_pct int default 5,
  streak int default 0
);

create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  amount numeric not null check (amount >= 0),
  kind text not null check (kind in ('spend', 'shift', 'saving')),
  category text check (category in ('food', 'transport', 'course', 'bills', 'going_out', 'takeaways', 'shopping', 'other')),
  note text,
  created_at timestamptz default now()
);

create table if not exists night_outs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  budget numeric not null,
  taxi_reserve numeric default 8,
  spent numeric default 0,
  started_at timestamptz default now(),
  ended_at timestamptz
);

create index if not exists transactions_user_created on transactions (user_id, created_at desc);

alter table profiles enable row level security;
alter table transactions enable row level security;
alter table night_outs enable row level security;

-- Users can only see and change their own rows
create policy "own profile select" on profiles for select using (user_id = auth.uid());
create policy "own profile insert" on profiles for insert with check (user_id = auth.uid());
create policy "own profile update" on profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own profile delete" on profiles for delete using (user_id = auth.uid());

create policy "own transactions select" on transactions for select using (user_id = auth.uid());
create policy "own transactions insert" on transactions for insert with check (user_id = auth.uid());
create policy "own transactions update" on transactions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own transactions delete" on transactions for delete using (user_id = auth.uid());

create policy "own night_outs select" on night_outs for select using (user_id = auth.uid());
create policy "own night_outs insert" on night_outs for insert with check (user_id = auth.uid());
create policy "own night_outs update" on night_outs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own night_outs delete" on night_outs for delete using (user_id = auth.uid());

-- Migration (7 Nov): categories changed. If you already ran the file above, run only these lines.
alter table transactions drop constraint if exists transactions_category_check;
update transactions set category = 'bills' where category = 'needs';
update transactions set category = 'other' where category = 'wants';
alter table transactions add constraint transactions_category_check
  check (category in ('food', 'transport', 'course', 'bills', 'going_out', 'takeaways', 'shopping', 'other'));

-- Migration (7 Nov): weekly budget engine. Run these lines once.
alter table profiles add column if not exists expected_shift_income numeric default 0;
alter table profiles add column if not exists last_weekly_budget numeric;
alter table profiles add column if not exists budget_mode text default 'balanced';
alter table profiles drop constraint if exists profiles_budget_mode_check;
alter table profiles add constraint profiles_budget_mode_check check (budget_mode in ('saver', 'balanced', 'relaxed'));
-- Gradual change: budget_ref is the previous day's budget (the 12% anchor), last_budget_date stops more than one save a day
alter table profiles add column if not exists budget_ref numeric;
alter table profiles add column if not exists last_budget_date date;

-- Migration (7 Nov): night out lock screen toggle. Run once.
alter table night_outs add column if not exists show_on_lock boolean default true;

-- Migration (7 Nov): bank feed, AI categorisation and learned merchant rules. Run once.
alter table transactions add column if not exists merchant text;
alter table transactions add column if not exists ai_categorised boolean default false;
alter table transactions add column if not exists source text default 'manual' check (source in ('manual', 'bank'));
alter table profiles add column if not exists bank_connected_at timestamptz;

create table if not exists user_merchant_rules (
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  merchant text not null, -- normalised, e.g. 'NANDOS MANCHESTER'
  category text not null check (category in ('food', 'transport', 'course', 'bills', 'going_out', 'takeaways', 'shopping', 'other')),
  created_at timestamptz default now(),
  primary key (user_id, merchant)
);
alter table user_merchant_rules enable row level security;
create policy "own rules select" on user_merchant_rules for select using (user_id = auth.uid());
create policy "own rules insert" on user_merchant_rules for insert with check (user_id = auth.uid());
create policy "own rules update" on user_merchant_rules for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rules delete" on user_merchant_rules for delete using (user_id = auth.uid());

-- Migration (7 Nov): fuel gauges replace rings. The user-picked 4th gauge. Run once.
alter table profiles add column if not exists gauge_category text default 'going_out';
alter table profiles add column if not exists gauge_limit numeric default 25;
