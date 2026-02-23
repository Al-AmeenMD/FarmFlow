-- ============================================================
-- FarmFlow — Auth Migration
-- Run this in Supabase SQL Editor AFTER the initial schema
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. ADD user_id COLUMN to all tables
-- ──────────────────────────────────────────────────────────────
alter table batches           add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table customers         add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table expenses          add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table revenue           add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table feed_purchases    add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table feed_consumption  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table mortality_logs    add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table weight_logs       add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table vaccinations      add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table photo_logs        add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- ──────────────────────────────────────────────────────────────
-- 2. INDEXES on user_id for fast per-user queries
-- ──────────────────────────────────────────────────────────────
create index if not exists idx_batches_user_id           on batches(user_id);
create index if not exists idx_customers_user_id         on customers(user_id);
create index if not exists idx_expenses_user_id          on expenses(user_id);
create index if not exists idx_revenue_user_id           on revenue(user_id);
create index if not exists idx_feed_purchases_user_id    on feed_purchases(user_id);
create index if not exists idx_feed_consumption_user_id  on feed_consumption(user_id);
create index if not exists idx_mortality_logs_user_id    on mortality_logs(user_id);
create index if not exists idx_weight_logs_user_id       on weight_logs(user_id);
create index if not exists idx_vaccinations_user_id      on vaccinations(user_id);
create index if not exists idx_photo_logs_user_id        on photo_logs(user_id);

-- ──────────────────────────────────────────────────────────────
-- 3. DROP old permissive policies
-- ──────────────────────────────────────────────────────────────
drop policy if exists "Allow all on batches"          on batches;
drop policy if exists "Allow all on customers"        on customers;
drop policy if exists "Allow all on expenses"         on expenses;
drop policy if exists "Allow all on revenue"          on revenue;
drop policy if exists "Allow all on feed_purchases"   on feed_purchases;
drop policy if exists "Allow all on feed_consumption" on feed_consumption;
drop policy if exists "Allow all on mortality_logs"   on mortality_logs;
drop policy if exists "Allow all on weight_logs"      on weight_logs;
drop policy if exists "Allow all on vaccinations"     on vaccinations;
drop policy if exists "Allow all on photo_logs"       on photo_logs;

-- ──────────────────────────────────────────────────────────────
-- 4. CREATE user-scoped RLS policies
--    Each user can only SELECT/INSERT/UPDATE/DELETE their own rows.
-- ──────────────────────────────────────────────────────────────

-- BATCHES
create policy "Users manage own batches"
  on batches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- CUSTOMERS
create policy "Users manage own customers"
  on customers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- EXPENSES
create policy "Users manage own expenses"
  on expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- REVENUE
create policy "Users manage own revenue"
  on revenue for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- FEED PURCHASES
create policy "Users manage own feed_purchases"
  on feed_purchases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- FEED CONSUMPTION
create policy "Users manage own feed_consumption"
  on feed_consumption for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- MORTALITY LOGS
create policy "Users manage own mortality_logs"
  on mortality_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- WEIGHT LOGS
create policy "Users manage own weight_logs"
  on weight_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- VACCINATIONS
create policy "Users manage own vaccinations"
  on vaccinations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- PHOTO LOGS
create policy "Users manage own photo_logs"
  on photo_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
