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
  category text check (category in ('needs', 'wants', 'going_out', 'food', 'takeaways', 'transport', 'course')),
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
