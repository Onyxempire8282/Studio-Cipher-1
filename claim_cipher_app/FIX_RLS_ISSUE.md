# 🔒 RLS (Row-Level Security) Issue - SOLVED

## The Problem

You're getting this error:

```
Error creating job: new row violates row-level security policy for table "claims"
```

This is because:

1. You **disabled the login screen** (no authentication)
2. Your Supabase RLS policies **require authentication** to create claims
3. Without being logged in, you can't create/read claims

## The Solution (Choose One)

### ⚡ OPTION 1: Disable RLS Completely (Fastest)

**Best for:** Quick testing, development environment

Run this in Supabase SQL Editor:

```sql
ALTER TABLE public.claims DISABLE ROW LEVEL SECURITY;
```

**Pros:**

- ✅ Works immediately
- ✅ No authentication needed
- ✅ Perfect for testing

**Cons:**

- ⚠️ Anyone can access your data (not secure for production)

**To re-enable later:**

```sql
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
```

---

### 🔐 OPTION 2: Add Anonymous Access Policy (Better)

**Best for:** Controlled public access

This keeps RLS enabled but allows unauthenticated users to access claims.

Run this in Supabase SQL Editor:

```sql
-- Allow anonymous users to insert claims
CREATE POLICY "claims_anonymous_insert"
  ON public.claims FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to read claims
CREATE POLICY "claims_anonymous_select"
  ON public.claims FOR SELECT
  TO anon
  USING (true);
```

**Pros:**

- ✅ More controlled than disabling RLS
- ✅ Can add conditions later (e.g., rate limiting)
- ✅ Better security practice

---

### 🎯 OPTION 3: Re-enable Login (Most Secure)

**Best for:** Production use

1. Uncomment the login check in `jobs-studio.html`
2. Create a test user in Supabase Authentication
3. Log in before using Jobs Studio

**Pros:**

- ✅ Full security
- ✅ User tracking
- ✅ Production-ready

---

## What to Do RIGHT NOW

1. **Go to Supabase Dashboard** → SQL Editor
2. **Run OPTION 1** (disable RLS) - quickest for testing
3. **Also run the firm_name command:**
   ```sql
   ALTER TABLE claims ADD COLUMN IF NOT EXISTS firm_name TEXT;
   ```
4. **Refresh Jobs Studio page**
5. **Create a job** - it will work! 🎉

## After Testing

Once you're done testing, you can:

- Re-enable RLS for security
- Add proper authentication back
- Use Option 2 for controlled public access

The `ADD_NEW_FIELDS_TO_SUPABASE.sql` file now has both options ready for you!
