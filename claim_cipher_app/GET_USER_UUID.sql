-- ============================================
-- GET USER UUID FOR: inspects@flav8r.net
-- ============================================

-- Find the UUID for the user
SELECT 
    id as user_uuid,
    email,
    created_at
FROM auth.users
WHERE email = 'inspects@flav8r.net';

-- Alternative: Check profiles table
SELECT 
    id as user_uuid,
    email,
    full_name
FROM public.profiles
WHERE email = 'inspects@flav8r.net';

-- ============================================
-- COPY THE UUID FROM ABOVE AND USE IT BELOW
-- ============================================

-- After you get the UUID, uncomment and run this:
/*
-- Update all existing jobs with NULL assigned_to to this user
UPDATE public.claims
SET assigned_to = 'PASTE-UUID-HERE'
WHERE assigned_to IS NULL;

-- Example:
-- UPDATE public.claims
-- SET assigned_to = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- WHERE assigned_to IS NULL;
*/

-- Verify the update worked
SELECT 
    claim_number,
    customer_name,
    assigned_to,
    status,
    created_at
FROM public.claims
ORDER BY created_at DESC
LIMIT 10;
