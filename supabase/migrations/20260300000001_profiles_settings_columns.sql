-- ============================================
-- Add settings columns to profiles table
-- ============================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name      TEXT,
  ADD COLUMN IF NOT EXISTS last_name       TEXT,
  ADD COLUMN IF NOT EXISTS company         TEXT,
  ADD COLUMN IF NOT EXISTS license_number  TEXT,
  ADD COLUMN IF NOT EXISTS phone           TEXT,
  ADD COLUMN IF NOT EXISTS street_address  TEXT,
  ADD COLUMN IF NOT EXISTS city            TEXT,
  ADD COLUMN IF NOT EXISTS state           TEXT,
  ADD COLUMN IF NOT EXISTS zip             TEXT;

-- ============================================
-- Add is_custom flag + firm_category to user_firms
-- (distinguishes preset firms from user-added custom firms)
-- ============================================

ALTER TABLE user_firms
  ADD COLUMN IF NOT EXISTS is_custom       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS firm_category   TEXT;
  -- firm_category values:
  -- 'daily_auto', 'heavy', 'catastrophic',
  -- 'property', 'nationwide', 'regional'
