-- ============================================
-- Fix profiles RLS policies to also match user_id
-- ============================================
-- The profiles table has both "id" and "user_id" columns.
-- Some rows were created with user_id = auth.uid() but id != auth.uid().
-- The original RLS policies only checked auth.uid() = id, causing
-- silent update failures for those rows.
--
-- This migration replaces the SELECT and UPDATE policies to accept
-- EITHER auth.uid() = id OR auth.uid() = user_id.

-- SELECT: allow if auth.uid() matches either id or user_id
DROP POLICY IF EXISTS "Profiles: select own" ON public.profiles;
CREATE POLICY "Profiles: select own"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR auth.uid() = user_id);

-- UPDATE: allow if auth.uid() matches either id or user_id
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
CREATE POLICY "Profiles: update own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR auth.uid() = user_id)
    WITH CHECK (auth.uid() = id OR auth.uid() = user_id);
