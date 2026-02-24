-- ============================================
-- Billing and Profiles Schema + RLS Baseline
-- ============================================

-- Profiles table (create if missing)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_tier TEXT NOT NULL DEFAULT 'none',
    subscription_status TEXT NOT NULL DEFAULT 'inactive',
    current_period_end TIMESTAMPTZ NULL,
    dispatch_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if profiles already exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'none';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dispatch_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_profiles_updated_at();

-- Billing events audit table
CREATE TABLE IF NOT EXISTS public.billing_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    event_type TEXT NOT NULL,
    stripe_event_id TEXT UNIQUE NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pro-only helper
CREATE OR REPLACE FUNCTION public.is_pro_user(uid uuid)
RETURNS BOOLEAN AS $$
DECLARE
    is_pro BOOLEAN;
BEGIN
    SELECT (
        subscription_tier = 'pro'
        AND subscription_status IN ('active', 'trialing')
        AND (current_period_end IS NULL OR current_period_end > NOW())
    )
    INTO is_pro
    FROM public.profiles
    WHERE id = uid;

    RETURN COALESCE(is_pro, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dispatch claims placeholder table (pro-only example)
CREATE TABLE IF NOT EXISTS public.dispatch_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    claim_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- Profiles policies (owner only)
DROP POLICY IF EXISTS "Profiles: select own" ON public.profiles;
CREATE POLICY "Profiles: select own"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: insert own" ON public.profiles;
CREATE POLICY "Profiles: insert own"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
CREATE POLICY "Profiles: update own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Routes policies (owner only)
DROP POLICY IF EXISTS "Routes: select own" ON public.routes;
CREATE POLICY "Routes: select own"
    ON public.routes FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Routes: insert own" ON public.routes;
CREATE POLICY "Routes: insert own"
    ON public.routes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Routes: update own" ON public.routes;
CREATE POLICY "Routes: update own"
    ON public.routes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Routes: delete own draft" ON public.routes;
CREATE POLICY "Routes: delete own draft"
    ON public.routes FOR DELETE
    USING (auth.uid() = user_id AND status = 'draft');

-- Mileage logs policies (owner only, immutable)
DROP POLICY IF EXISTS "Mileage logs: select own" ON public.mileage_logs;
CREATE POLICY "Mileage logs: select own"
    ON public.mileage_logs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Mileage logs: insert own" ON public.mileage_logs;
CREATE POLICY "Mileage logs: insert own"
    ON public.mileage_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Mileage logs: block updates" ON public.mileage_logs;
CREATE POLICY "Mileage logs: block updates"
    ON public.mileage_logs FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "Mileage logs: block deletes" ON public.mileage_logs;
CREATE POLICY "Mileage logs: block deletes"
    ON public.mileage_logs FOR DELETE
    USING (false);

-- Dispatch claims policies (pro-only)
DROP POLICY IF EXISTS "Dispatch claims: select" ON public.dispatch_claims;
CREATE POLICY "Dispatch claims: select"
    ON public.dispatch_claims FOR SELECT
    USING (owner_id = auth.uid() AND public.is_pro_user(auth.uid()));

DROP POLICY IF EXISTS "Dispatch claims: insert" ON public.dispatch_claims;
CREATE POLICY "Dispatch claims: insert"
    ON public.dispatch_claims FOR INSERT
    WITH CHECK (owner_id = auth.uid() AND public.is_pro_user(auth.uid()));

DROP POLICY IF EXISTS "Dispatch claims: update" ON public.dispatch_claims;
CREATE POLICY "Dispatch claims: update"
    ON public.dispatch_claims FOR UPDATE
    USING (owner_id = auth.uid() AND public.is_pro_user(auth.uid()))
    WITH CHECK (owner_id = auth.uid() AND public.is_pro_user(auth.uid()));

DROP POLICY IF EXISTS "Dispatch claims: delete" ON public.dispatch_claims;
CREATE POLICY "Dispatch claims: delete"
    ON public.dispatch_claims FOR DELETE
    USING (owner_id = auth.uid() AND public.is_pro_user(auth.uid()));

-- Billing events: no policies (service role only)
