-- ============================================
-- SETUP FOR USER: inspects@flav8r.net
-- UUID: 909673ed-cfe3-4d2b-a35b-01f87bc93a4e
-- ============================================

-- 1. UPDATE ALL EXISTING JOBS TO THIS USER
-- This makes all Jobs Studio jobs appear in mobile app
UPDATE public.claims
SET assigned_to = '909673ed-cfe3-4d2b-a35b-01f87bc93a4e'
WHERE assigned_to IS NULL;

-- 2. VERIFY THE UPDATE
SELECT 
    claim_number,
    customer_name,
    assigned_to,
    status,
    created_at
FROM public.claims
ORDER BY created_at DESC
LIMIT 20;

-- 3. CHECK HOW MANY JOBS WERE UPDATED
SELECT 
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN assigned_to = '909673ed-cfe3-4d2b-a35b-01f87bc93a4e' THEN 1 END) as jobs_assigned_to_user,
    COUNT(CASE WHEN assigned_to IS NULL THEN 1 END) as unassigned_jobs
FROM public.claims;

-- ============================================
-- SUCCESS! Now do this in Jobs Studio:
-- ============================================
-- Open Jobs Studio console and run:
-- localStorage.setItem("user_id", "909673ed-cfe3-4d2b-a35b-01f87bc93a4e");
-- 
-- Then refresh and create a new job!
-- ============================================
