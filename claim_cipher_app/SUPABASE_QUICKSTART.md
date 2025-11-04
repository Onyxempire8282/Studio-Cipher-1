# 🚀 Supabase Jobs Studio - Quick Start Guide

## 5-Minute Setup

### Step 1: Create Database Table (2 minutes)

Copy and run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS public.claims (
    id BIGSERIAL PRIMARY KEY,
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    insured_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled',
    priority VARCHAR(20) DEFAULT 'medium',
    claim_type VARCHAR(100),
    policy_number VARCHAR(50),
    deductible VARCHAR(50),
    coverage_type VARCHAR(100),
    estimated_duration VARCHAR(50),
    actual_duration VARCHAR(50),
    assigned_to VARCHAR(255),
    photos JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.claims
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### Step 2: Get Your Credentials (1 minute)

1. In Supabase Dashboard → Settings → API
2. Copy **Project URL** (looks like: https://xxxxx.supabase.co)
3. Copy **anon public** key

### Step 3: Configure (1 minute)

**Option A - Test Page:**

1. Open `supabase-test.html`
2. Paste URL and key
3. Click "Save Configuration"
4. Click "Test Connection"

**Option B - Browser Console:**

```javascript
localStorage.setItem("supabase_url", "YOUR_URL_HERE");
localStorage.setItem("supabase_anon_key", "YOUR_KEY_HERE");
```

### Step 4: Open Jobs Studio (1 minute)

1. Refresh or open `jobs-studio.html`
2. Look for "✅ Connected to Supabase database" notification
3. Jobs will now load from your database!

## ✅ You're Done!

Jobs Studio is now:

- 📊 Loading data from Supabase
- 🔄 Syncing changes in real-time
- 💾 Saving all updates to database
- 📱 Ready for mobile app integration

## Quick Test

1. Open Jobs Studio in two browser tabs
2. Start a job in one tab
3. Watch it update instantly in the other tab
4. That's real-time sync! 🎉

## Need Help?

- 📖 Full guide: `SUPABASE_JOBS_SETUP.md`
- 🧪 Test page: `supabase-test.html`
- 💬 Console helper: Type `supabaseHelper.showInstructions()` in browser console

## Common Issues

**"Failed to load jobs"**

- Check table name is exactly `claims`
- Verify RLS policy is created
- Test connection in `supabase-test.html`

**"Supabase not configured"**

- Verify credentials saved in localStorage
- Check console for error messages
- Re-enter credentials

**Real-time not working**

- Check Realtime is enabled in Supabase project settings (Database → Replication)
- Verify browser tab is active
- Check browser console for subscription status

---

That's it! Your Jobs Studio is now powered by Supabase. 🚀
