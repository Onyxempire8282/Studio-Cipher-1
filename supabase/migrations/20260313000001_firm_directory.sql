-- ============================================
-- Firm Directory — read-only reference table
-- 43 preset firms visible to all authenticated
-- users. Only service_role can write.
-- ============================================

CREATE TABLE IF NOT EXISTS public.firm_directory (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT         NOT NULL,
    type           TEXT,        -- 'daily_auto', 'catastrophic', 'regional'
    coverage_area  TEXT,
    website        TEXT,
    contact_name   TEXT,
    contact_email  TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.firm_directory ENABLE ROW LEVEL SECURITY;

-- SELECT open to all authenticated users
DROP POLICY IF EXISTS "firm_directory: authenticated read" ON public.firm_directory;
CREATE POLICY "firm_directory: authenticated read"
    ON public.firm_directory FOR SELECT
    TO authenticated
    USING (true);

-- No INSERT/UPDATE/DELETE policies — only service_role can write
