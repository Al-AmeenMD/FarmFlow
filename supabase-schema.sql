-- ============================================================
-- FarmFlow — Supabase Database Schema
-- Run this in the Supabase SQL Editor (supabase.com/dashboard)
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────────
-- 1. BATCHES
-- ──────────────────────────────────────────────────────────────
create table if not exists batches (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  quantity      integer not null default 0,
  breed         text,
  source        text,
  pen           text,
  target_weight numeric,
  cost_per_chick numeric default 0,
  start_date    date not null default current_date,
  age_at_acquisition integer default 0,
  status        text not null default 'Day-old',
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 2. CUSTOMERS
-- ──────────────────────────────────────────────────────────────
create table if not exists customers (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  phone       text,
  address     text,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 3. EXPENSES
-- ──────────────────────────────────────────────────────────────
create table if not exists expenses (
  id          uuid primary key default uuid_generate_v4(),
  batch_id    uuid references batches(id) on delete set null,
  category    text not null,
  unit_cost   numeric default 0,
  quantity    integer default 1,
  amount      numeric not null default 0,
  description text,
  date        date not null default current_date,
  source      text,  -- 'inventory' when auto-created from feed purchase
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 4. REVENUE
-- ──────────────────────────────────────────────────────────────
create table if not exists revenue (
  id            uuid primary key default uuid_generate_v4(),
  batch_id      uuid references batches(id) on delete set null,
  customer_id   uuid references customers(id) on delete set null,
  category      text not null,
  unit_cost     numeric default 0,
  quantity      integer default 1,
  amount        numeric not null default 0,
  description   text,
  price_per_kg  numeric,
  date          date not null default current_date,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 5. FEED PURCHASES
-- ──────────────────────────────────────────────────────────────
create table if not exists feed_purchases (
  id                uuid primary key default uuid_generate_v4(),
  batch_id          uuid references batches(id) on delete set null,
  linked_expense_id uuid references expenses(id) on delete set null,
  feed_type         text,
  quantity          numeric not null default 0,   -- total kg
  unit_cost         numeric default 0,            -- cost per bag
  bags              integer default 1,
  cost              numeric not null default 0,   -- total cost
  supplier          text,
  date              date not null default current_date,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 6. FEED CONSUMPTION
-- ──────────────────────────────────────────────────────────────
create table if not exists feed_consumption (
  id          uuid primary key default uuid_generate_v4(),
  batch_id    uuid references batches(id) on delete set null,
  feed_type   text,
  quantity    numeric not null default 0,   -- kg consumed
  date        date not null default current_date,
  created_at  timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 7. MORTALITY LOGS
-- ──────────────────────────────────────────────────────────────
create table if not exists mortality_logs (
  id          uuid primary key default uuid_generate_v4(),
  batch_id    uuid references batches(id) on delete cascade,
  quantity    integer not null default 0,
  cause       text,
  date        date not null default current_date,
  created_at  timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 8. WEIGHT LOGS
-- ──────────────────────────────────────────────────────────────
create table if not exists weight_logs (
  id          uuid primary key default uuid_generate_v4(),
  batch_id    uuid references batches(id) on delete cascade,
  weight      numeric not null default 0,
  sample_size integer,
  notes       text,
  date        date not null default current_date,
  created_at  timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 9. VACCINATIONS (Health Schedule)
-- ──────────────────────────────────────────────────────────────
create table if not exists vaccinations (
  id              uuid primary key default uuid_generate_v4(),
  batch_id        uuid references batches(id) on delete cascade,
  name            text not null,
  target_day      integer not null,
  type            text not null default 'vaccine',  -- 'vaccine' or 'medication'
  status          text not null default 'pending',  -- 'pending' or 'done'
  completed_date  date,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 10. PHOTO LOGS
-- ──────────────────────────────────────────────────────────────
create table if not exists photo_logs (
  id          uuid primary key default uuid_generate_v4(),
  batch_id    uuid references batches(id) on delete cascade,
  photo       text,       -- base64 data URI
  caption     text,
  date        date not null default current_date,
  created_at  timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- INDEXES for common queries
-- ──────────────────────────────────────────────────────────────
create index if not exists idx_expenses_batch_id on expenses(batch_id);
create index if not exists idx_expenses_date on expenses(date);
create index if not exists idx_revenue_batch_id on revenue(batch_id);
create index if not exists idx_revenue_customer_id on revenue(customer_id);
create index if not exists idx_revenue_date on revenue(date);
create index if not exists idx_feed_purchases_date on feed_purchases(date);
create index if not exists idx_feed_consumption_batch_id on feed_consumption(batch_id);
create index if not exists idx_mortality_logs_batch_id on mortality_logs(batch_id);
create index if not exists idx_weight_logs_batch_id on weight_logs(batch_id);
create index if not exists idx_vaccinations_batch_id on vaccinations(batch_id);
create index if not exists idx_photo_logs_batch_id on photo_logs(batch_id);

-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (permissive — no auth yet)
-- ──────────────────────────────────────────────────────────────
alter table batches enable row level security;
alter table customers enable row level security;
alter table expenses enable row level security;
alter table revenue enable row level security;
alter table feed_purchases enable row level security;
alter table feed_consumption enable row level security;
alter table mortality_logs enable row level security;
alter table weight_logs enable row level security;
alter table vaccinations enable row level security;
alter table photo_logs enable row level security;

-- Allow all operations for now (no auth)
create policy "Allow all on batches" on batches for all using (true) with check (true);
create policy "Allow all on customers" on customers for all using (true) with check (true);
create policy "Allow all on expenses" on expenses for all using (true) with check (true);
create policy "Allow all on revenue" on revenue for all using (true) with check (true);
create policy "Allow all on feed_purchases" on feed_purchases for all using (true) with check (true);
create policy "Allow all on feed_consumption" on feed_consumption for all using (true) with check (true);
create policy "Allow all on mortality_logs" on mortality_logs for all using (true) with check (true);
create policy "Allow all on weight_logs" on weight_logs for all using (true) with check (true);
create policy "Allow all on vaccinations" on vaccinations for all using (true) with check (true);
create policy "Allow all on photo_logs" on photo_logs for all using (true) with check (true);
