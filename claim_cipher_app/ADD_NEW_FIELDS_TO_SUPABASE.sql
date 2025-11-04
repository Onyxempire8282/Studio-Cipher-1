-- SQL Commands to Add New Fields to Supabase Claims Table
-- Run these commands in your Supabase SQL Editor

-- NOTE: Your original schema already has most vehicle fields!
-- (vin, vehicle_make, vehicle_model, vehicle_year already exist)

-- Add the only MISSING field: firm_name
ALTER TABLE claims 
ADD COLUMN IF NOT EXISTS firm_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN claims.firm_name IS 'Insurance company or firm name';

-- =========================================
-- OPTION 1: DISABLE RLS FOR TESTING (Quick Fix)
-- =========================================
-- WARNING: This allows anyone to read/write claims without authentication
-- Only use for development/testing!

ALTER TABLE public.claims DISABLE ROW LEVEL SECURITY;

-- To re-enable later:
-- ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- =========================================
-- OPTION 2: ADD PUBLIC ACCESS POLICY (Better)
-- =========================================
-- This allows unauthenticated users to create/read claims
-- Uncomment these if you prefer this approach:

/*
-- Allow anonymous users to insert claims
DROP POLICY IF EXISTS "claims_anonymous_insert" ON public.claims;
CREATE POLICY "claims_anonymous_insert"
  ON public.claims FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to read all claims
DROP POLICY IF EXISTS "claims_anonymous_select" ON public.claims;
CREATE POLICY "claims_anonymous_select"
  ON public.claims FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to update claims
DROP POLICY IF EXISTS "claims_anonymous_update" ON public.claims;
CREATE POLICY "claims_anonymous_update"
  ON public.claims FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
*/

-- Verify the changes
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'claims'
ORDER BY ordinal_position;

