-- ============================================
-- User Firms Table + RLS
-- Replaces localStorage-only firm storage.
-- Firms are now cloud-persisted, user-scoped,
-- and survive deploys, device changes, and
-- browser cache clears.
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_firms (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    firm_id     TEXT        NOT NULL,           -- user-defined slug: "state-farm", "allstate", etc.
    name        TEXT        NOT NULL,
    free_miles  INTEGER     NOT NULL DEFAULT 0,
    rate_per_mile NUMERIC(6,4) NOT NULL DEFAULT 0.0,
    round_trip_default BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, firm_id)                  -- one row per firm slug per user
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_user_firms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_firms_updated_at ON public.user_firms;
CREATE TRIGGER set_user_firms_updated_at
    BEFORE UPDATE ON public.user_firms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_firms_updated_at();

-- Enable RLS
ALTER TABLE public.user_firms ENABLE ROW LEVEL SECURITY;

-- Policies: owner only
DROP POLICY IF EXISTS "User firms: select own" ON public.user_firms;
CREATE POLICY "User firms: select own"
    ON public.user_firms FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "User firms: insert own" ON public.user_firms;
CREATE POLICY "User firms: insert own"
    ON public.user_firms FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User firms: update own" ON public.user_firms;
CREATE POLICY "User firms: update own"
    ON public.user_firms FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User firms: delete own" ON public.user_firms;
CREATE POLICY "User firms: delete own"
    ON public.user_firms FOR DELETE
    USING (auth.uid() = user_id);
