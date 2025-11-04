# Supabase Jobs Studio Integration Setup

## Overview

The Jobs Studio page is now integrated with Supabase for real-time claim management and mobile synchronization. This guide will help you set up and configure the integration.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project created
3. Database table structure set up (see below)

## Step 1: Create the Claims Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create claims table for Jobs Studio
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

-- Create index for faster queries
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_claims_assigned_to ON public.claims(assigned_to);
CREATE INDEX idx_claims_created_at ON public.claims(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth requirements)
-- Allow authenticated users to read all claims
CREATE POLICY "Allow authenticated users to read claims"
    ON public.claims FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert claims
CREATE POLICY "Allow authenticated users to insert claims"
    ON public.claims FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update claims
CREATE POLICY "Allow authenticated users to update claims"
    ON public.claims FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_claims_updated_at BEFORE UPDATE
    ON public.claims FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Step 2: Configure Supabase Credentials

You have two options:

### Option A: Use Browser Console (Quick Test)

Open your browser console on the Jobs Studio page and run:

```javascript
localStorage.setItem("supabase_url", "YOUR_SUPABASE_PROJECT_URL");
localStorage.setItem("supabase_anon_key", "YOUR_SUPABASE_ANON_KEY");
```

Replace:

- `YOUR_SUPABASE_PROJECT_URL` with your project URL (e.g., `https://xxxxx.supabase.co`)
- `YOUR_SUPABASE_ANON_KEY` with your anon/public key

### Option B: Add to Settings Page

Update your `settings-booth.html` to include a Supabase configuration section where users can enter and save their credentials.

## Step 3: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Click on "Settings" (gear icon) in the sidebar
3. Click on "API" under Project Settings
4. Copy:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## Step 4: Test the Integration

1. Open the Jobs Studio page (`jobs-studio.html`)
2. Check the browser console for:

   - "✅ Supabase client initialized successfully"
   - "📥 Fetching jobs from Supabase..."
   - "📡 Real-time sync active"

3. Try these features:
   - **View Jobs**: Should load from Supabase database
   - **Start Job**: Updates status in real-time
   - **Complete Job**: Saves completion time to database
   - **Add Photos**: Updates photo array in database
   - **Real-time Sync**: Open Jobs Studio in two browser tabs and watch changes sync automatically

## Features Enabled

### ✅ Real-time Synchronization

- Changes made in one browser/device appear instantly in others
- No page refresh needed
- Supports INSERT, UPDATE, and DELETE operations

### ✅ Database Persistence

- All job data stored in Supabase PostgreSQL database
- No data loss on browser refresh
- Secure and scalable storage

### ✅ Mobile Integration Ready

- Mobile app can read/write to same claims table
- Photos uploaded from mobile appear instantly
- Status updates sync across all devices

### ✅ Fallback Mode

- If Supabase credentials not found, uses demo data
- Graceful error handling
- Clear notifications about connection status

## Data Mapping

| Jobs Studio Field | Supabase Column | Type      |
| ----------------- | --------------- | --------- |
| id                | id              | BIGINT    |
| claimNumber       | claim_number    | VARCHAR   |
| insured           | insured_name    | VARCHAR   |
| address           | address         | TEXT      |
| phone             | phone           | VARCHAR   |
| email             | email           | VARCHAR   |
| status            | status          | VARCHAR   |
| priority          | priority        | VARCHAR   |
| type              | claim_type      | VARCHAR   |
| inspector         | assigned_to     | VARCHAR   |
| photos            | photos          | JSONB     |
| notes             | notes           | TEXT      |
| tags              | tags            | JSONB     |
| created           | created_at      | TIMESTAMP |
| startedAt         | started_at      | TIMESTAMP |
| completedAt       | completed_at    | TIMESTAMP |
| scheduledDate     | scheduled_date  | TIMESTAMP |

## Troubleshooting

### "Supabase not configured" warning

- Check that credentials are saved in localStorage
- Verify the URL and key are correct
- Check browser console for detailed errors

### Real-time sync not working

- Verify Realtime is enabled in Supabase project settings
- Check that RLS policies allow reading/writing
- Ensure you're using the anon key, not the service role key

### Jobs not loading

- Check table exists and has correct name (`claims`)
- Verify RLS policies are set up correctly
- Check browser console for error messages

## Security Best Practices

1. **Never commit Supabase keys to git**

   - Add them to `.gitignore`
   - Use environment variables in production

2. **Use Row Level Security (RLS)**

   - Already set up in the SQL above
   - Customize policies based on your needs

3. **Implement Authentication**

   - Currently allows any authenticated user
   - Consider adding user-specific policies

4. **Validate Data**
   - Add database constraints
   - Validate on client and server side

## Next Steps

1. **Add Photo Upload**

   - Integrate Supabase Storage for actual photo files
   - Update photo array with storage URLs

2. **Add Search and Filters**

   - Add database indexes for search fields
   - Implement advanced filtering queries

3. **Add Assignment Features**

   - Update `assigned_to` field to assign claims to inspectors
   - Add inspector management interface

4. **Mobile App Integration**
   - Mobile app connects to same Supabase project
   - Uses same claims table
   - Real-time sync works across platforms

## Support

For issues or questions:

- Check Supabase documentation: https://supabase.com/docs
- Review browser console for error messages
- Test database connection in Supabase dashboard

---

**Last Updated**: November 3, 2025
**Version**: 1.0.0
