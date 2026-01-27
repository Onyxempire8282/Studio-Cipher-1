-- ============================================
-- ROUTES AND MILEAGE LOGS TABLES
-- Claim Cipher Route Lifecycle & Tax Logging
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. ROUTES TABLE
-- Persisted route records with lifecycle status
-- ============================================

CREATE TABLE IF NOT EXISTS routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
    total_miles DECIMAL(10,2),
    start_address TEXT NOT NULL,
    end_address TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent closing routes without valid mileage
    CONSTRAINT routes_closed_requires_miles CHECK (
        status = 'draft'
        OR status = 'active'
        OR (status = 'closed' AND total_miles IS NOT NULL AND total_miles >= 0)
    )
);

COMMENT ON TABLE routes IS 'Route records with lifecycle: draft -> active -> closed';
COMMENT ON COLUMN routes.user_id IS 'Authenticated user UUID (auth.uid())';
COMMENT ON COLUMN routes.date IS 'Effective work date (user-controlled)';
COMMENT ON COLUMN routes.status IS 'Lifecycle state: draft, active, or closed';
COMMENT ON COLUMN routes.total_miles IS 'Total route mileage (read from planning tool, not calculated here)';

-- 2. MILEAGE LOGS TABLE
-- Immutable tax records created when routes are closed
-- ============================================

CREATE TABLE IF NOT EXISTS mileage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route_id UUID NOT NULL UNIQUE REFERENCES routes(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL,
    log_date DATE NOT NULL,
    start_address TEXT NOT NULL,
    end_address TEXT NOT NULL,
    total_miles DECIMAL(10,2) NOT NULL,
    claim_count INTEGER NOT NULL DEFAULT 0,
    claim_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent logging routes with zero or negative mileage
    CONSTRAINT mileage_logs_nonzero_miles CHECK (total_miles > 0)
);

COMMENT ON TABLE mileage_logs IS 'Immutable IRS-defensible mileage records';
COMMENT ON COLUMN mileage_logs.route_id IS 'One-to-one FK to closed route (UNIQUE + ON DELETE RESTRICT)';
COMMENT ON COLUMN mileage_logs.user_id IS 'Authenticated user UUID (auth.uid())';
COMMENT ON COLUMN mileage_logs.log_date IS 'Copied from route.date at close time';
COMMENT ON COLUMN mileage_logs.claim_ids IS 'Array of claim UUIDs associated with this route';

-- 3. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_date ON routes(date DESC);
CREATE INDEX IF NOT EXISTS idx_routes_user_status ON routes(user_id, status);

CREATE INDEX IF NOT EXISTS idx_mileage_logs_user_id ON mileage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mileage_logs_log_date ON mileage_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_mileage_logs_user_date ON mileage_logs(user_id, log_date);

-- 4. UPDATED_AT TRIGGER FOR ROUTES
-- Auto-update updated_at on row changes
-- ============================================

CREATE OR REPLACE FUNCTION update_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_routes_updated_at ON routes;
CREATE TRIGGER set_routes_updated_at
    BEFORE UPDATE ON routes
    FOR EACH ROW
    EXECUTE FUNCTION update_routes_updated_at();

-- 5. ROW LEVEL SECURITY
-- Users can only access their own data
-- ============================================

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_logs ENABLE ROW LEVEL SECURITY;

-- Routes: full CRUD on own records (with status restrictions)
DROP POLICY IF EXISTS "Users can view own routes" ON routes;
CREATE POLICY "Users can view own routes"
    ON routes FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own routes" ON routes;
CREATE POLICY "Users can insert own routes"
    ON routes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own routes" ON routes;
CREATE POLICY "Users can update own routes"
    ON routes FOR UPDATE
    USING (auth.uid() = user_id);

-- DELETE: Only allow deleting draft routes
-- IMPORTANT: Do NOT loosen this policy. Active/closed routes must not be deleted.
-- Closed routes have linked mileage_logs (FK with ON DELETE RESTRICT prevents this anyway).
DROP POLICY IF EXISTS "Users can delete own draft routes" ON routes;
CREATE POLICY "Users can delete own draft routes"
    ON routes FOR DELETE
    USING (auth.uid() = user_id AND status = 'draft');

-- Mileage logs: SELECT and INSERT only (immutable tax records)
DROP POLICY IF EXISTS "Users can view own mileage_logs" ON mileage_logs;
CREATE POLICY "Users can view own mileage_logs"
    ON mileage_logs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own mileage_logs" ON mileage_logs;
CREATE POLICY "Users can insert own mileage_logs"
    ON mileage_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Explicitly block UPDATE and DELETE on mileage_logs
-- These are immutable tax records - no modifications allowed
DROP POLICY IF EXISTS "Block mileage_logs updates" ON mileage_logs;
CREATE POLICY "Block mileage_logs updates"
    ON mileage_logs FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "Block mileage_logs deletes" ON mileage_logs;
CREATE POLICY "Block mileage_logs deletes"
    ON mileage_logs FOR DELETE
    USING (false);

-- 6. VERIFY DEPLOYMENT
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'routes') THEN
        RAISE NOTICE 'routes table created successfully';
    ELSE
        RAISE NOTICE 'routes table FAILED to create';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mileage_logs') THEN
        RAISE NOTICE 'mileage_logs table created successfully';
    ELSE
        RAISE NOTICE 'mileage_logs table FAILED to create';
    END IF;

    RAISE NOTICE 'Route lifecycle tables deployment complete';
END $$;

-- ============================================
-- END OF MIGRATION
-- ============================================
