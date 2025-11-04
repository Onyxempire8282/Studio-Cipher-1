-- ============================================
-- SUPABASE DEPLOYMENT SQL FOR CIPHERDASHBOARD
-- Run this in Supabase SQL Editor → Deploy Section
-- ============================================

-- 1. ADD MISSING FIRM_NAME COLUMN
-- ============================================
ALTER TABLE public.claims 
ADD COLUMN IF NOT EXISTS firm_name TEXT;

COMMENT ON COLUMN public.claims.firm_name IS 'Insurance company or firm name';

-- 2. DISABLE RLS FOR DEVELOPMENT/TESTING
-- ============================================
-- WARNING: This allows unauthenticated access for testing
-- Re-enable RLS when moving to production!

ALTER TABLE public.claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_photos DISABLE ROW LEVEL SECURITY;

-- To re-enable later (for production):
-- ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.claim_photos ENABLE ROW LEVEL SECURITY;

-- 3. ADD INDEXES FOR PERFORMANCE
-- ============================================
-- These improve query performance for Jobs Studio

CREATE INDEX IF NOT EXISTS idx_claims_status 
ON public.claims(status);

CREATE INDEX IF NOT EXISTS idx_claims_created_at 
ON public.claims(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claims_firm_name 
ON public.claims(firm_name) 
WHERE firm_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_claims_vehicle 
ON public.claims(vehicle_make, vehicle_model, vehicle_year) 
WHERE vehicle_make IS NOT NULL;

-- 4. ADD HELPFUL FUNCTIONS
-- ============================================

-- Function to get job count by status
CREATE OR REPLACE FUNCTION get_job_counts()
RETURNS TABLE(
    status TEXT,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        claims.status,
        COUNT(*)::BIGINT
    FROM public.claims
    GROUP BY claims.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old test data
CREATE OR REPLACE FUNCTION delete_test_claims()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.claims
    WHERE claim_number LIKE 'TEST-%' 
       OR claim_number LIKE 'CLM-TEST-%'
       OR customer_name LIKE '%Test%';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ADD UPDATED_AT TRIGGER (if not exists)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.claims;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. VERIFY DEPLOYMENT
-- ============================================
-- Check that everything is set up correctly

DO $$
BEGIN
    -- Check if firm_name column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'claims' 
        AND column_name = 'firm_name'
    ) THEN
        RAISE NOTICE '✅ firm_name column exists';
    ELSE
        RAISE NOTICE '❌ firm_name column missing';
    END IF;
    
    -- Check RLS status
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'claims' 
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE '✅ RLS is disabled (development mode)';
    ELSE
        RAISE NOTICE '⚠️ RLS is enabled (production mode)';
    END IF;
    
    RAISE NOTICE '✅ Deployment completed successfully!';
END $$;

-- 7. OPTIONAL: VIEW CURRENT SCHEMA
-- ============================================
-- Uncomment to see all columns in claims table

/*
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'claims'
ORDER BY ordinal_position;
*/

-- 8. OPTIONAL: CLEANUP TEST DATA
-- ============================================
-- Uncomment to delete all test claims

/*
SELECT delete_test_claims();
*/

-- 9. OPTIONAL: VIEW JOB STATISTICS
-- ============================================
-- Uncomment to see job counts by status

/*
SELECT * FROM get_job_counts();
*/

-- ============================================
-- END OF DEPLOYMENT SQL
-- ============================================

-- NEXT STEPS:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Click "New Query"
-- 4. Paste this SQL
-- 5. Click "Run" or press Ctrl+Enter
-- 6. Check the output panel for success messages
-- 7. Refresh your Jobs Studio page
-- 8. Test creating and deleting jobs

-- For Production:
-- - Re-enable RLS with proper policies
-- - Remove test data cleanup function
-- - Add monitoring and alerting
-- - Set up backups
