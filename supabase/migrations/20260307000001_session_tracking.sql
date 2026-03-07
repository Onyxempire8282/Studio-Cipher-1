-- Add single-active-session tracking columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS active_session_token TEXT,
  ADD COLUMN IF NOT EXISTS active_session_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS active_session_device TEXT;
