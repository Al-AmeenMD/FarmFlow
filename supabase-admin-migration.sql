-- ============================================================
-- FarmFlow — Super Admin Migration
-- Run this in the Supabase SQL Editor AFTER the base schema
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. PROFILES TABLE  (admin flag for each user)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  is_admin   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow users to read their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users
INSERT INTO profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 2. HELPER: check if current user is admin
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ──────────────────────────────────────────────────────────────
-- 3. RPC: admin_get_platform_stats
-- Returns aggregate stats across ALL users
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_platform_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT json_build_object(
    'total_users',    (SELECT COUNT(*) FROM profiles),
    'total_batches',  (SELECT COUNT(*) FROM batches),
    'total_birds',    (SELECT COALESCE(SUM(quantity), 0) FROM batches),
    'total_revenue',  (SELECT COALESCE(SUM(amount), 0) FROM revenue),
    'total_expenses', (SELECT COALESCE(SUM(amount), 0) FROM expenses),
    'total_customers',(SELECT COUNT(*) FROM customers)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- 4. RPC: admin_get_users
-- Returns all users with their activity stats
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_users()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT
      p.id,
      p.email,
      p.is_admin,
      p.created_at AS signup_date,
      u.last_sign_in_at,
      (SELECT COUNT(*) FROM batches b WHERE b.user_id = p.id) AS batch_count,
      (SELECT COUNT(*) FROM revenue r WHERE r.user_id = p.id) AS revenue_entries,
      (SELECT COUNT(*) FROM expenses e WHERE e.user_id = p.id) AS expense_entries
    FROM profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- 5. RPC: admin_get_table_counts
-- Returns row counts for each table (system health)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_table_counts()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT json_build_object(
    'profiles',        (SELECT COUNT(*) FROM profiles),
    'batches',         (SELECT COUNT(*) FROM batches),
    'customers',       (SELECT COUNT(*) FROM customers),
    'expenses',        (SELECT COUNT(*) FROM expenses),
    'revenue',         (SELECT COUNT(*) FROM revenue),
    'feed_purchases',  (SELECT COUNT(*) FROM feed_purchases),
    'feed_consumption',(SELECT COUNT(*) FROM feed_consumption),
    'weight_logs',     (SELECT COUNT(*) FROM weight_logs),
    'mortality_logs',  (SELECT COUNT(*) FROM mortality_logs),
    'vaccinations',    (SELECT COUNT(*) FROM vaccinations),
    'photo_logs',      (SELECT COUNT(*) FROM photo_logs)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- 6. RPC: admin_get_recent_activity
-- Returns latest 25 entries across all tables
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_recent_activity()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT 'batch' AS type, b.name AS label, p.email AS user_email, b.created_at
    FROM batches b LEFT JOIN profiles p ON p.id = b.user_id
    UNION ALL
    SELECT 'expense', e.description, p.email, e.created_at
    FROM expenses e LEFT JOIN profiles p ON p.id = e.user_id
    UNION ALL
    SELECT 'revenue', r.description, p.email, r.created_at
    FROM revenue r LEFT JOIN profiles p ON p.id = r.user_id
    UNION ALL
    SELECT 'feed_purchase', fp.feed_type, p.email, fp.created_at
    FROM feed_purchases fp LEFT JOIN profiles p ON p.id = fp.user_id
    UNION ALL
    SELECT 'customer', c.name, p.email, c.created_at
    FROM customers c LEFT JOIN profiles p ON p.id = c.user_id
    ORDER BY created_at DESC
    LIMIT 25
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- 7. RPC: admin_check (lightweight admin check for UI)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_check()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ──────────────────────────────────────────────────────────────
-- 8. MARK YOUR ACCOUNT AS ADMIN
-- Replace the email below with YOUR email address
-- ──────────────────────────────────────────────────────────────
-- UPDATE profiles SET is_admin = TRUE WHERE email = 'your-email@example.com';
