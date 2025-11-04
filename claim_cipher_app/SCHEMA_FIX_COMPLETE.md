# ✅ Jobs Studio - Supabase Schema Fix Applied

## What Was Fixed

Your original Supabase schema uses **different column names** than what the code was trying to use. I've updated the JavaScript code to match your **actual** Supabase schema.

## Column Name Mappings

| Code Was Using        | Actual Supabase Column |
| --------------------- | ---------------------- |
| `insured_name`        | `customer_name` ✅     |
| `address`             | `address_line1` ✅     |
| `scheduled_date`      | `appointment_start` ✅ |
| `status: "scheduled"` | `status: "NEW"` ✅     |

## Fields Already in Your Schema

✅ **These fields already exist** in your Supabase `claims` table:

- `vin` - Vehicle Identification Number
- `vehicle_make` - Vehicle manufacturer
- `vehicle_model` - Vehicle model name
- `vehicle_year` - Vehicle year (integer)
- `customer_name` - Customer/insured name
- `address_line1` - Primary address
- `phone` - Phone number
- `email` - Email address
- `claim_number` - Unique claim identifier
- `appointment_start` - Scheduled appointment time
- `notes` - Additional notes
- `status` - Claim status (NEW, SCHEDULED, IN_PROGRESS, COMPLETED)

## What You Need to Add

Only **ONE** field is missing from your schema:

### Run This SQL in Supabase:

```sql
-- Add the firm_name column
ALTER TABLE claims
ADD COLUMN IF NOT EXISTS firm_name TEXT;

COMMENT ON COLUMN claims.firm_name IS 'Insurance company or firm name';
```

## Status Values

The status dropdown now uses the correct values from your schema:

- **NEW** (default for new jobs)
- **SCHEDULED**
- **IN_PROGRESS**
- **COMPLETED**

## What to Do Next

1. **Go to Supabase Dashboard** → SQL Editor
2. **Run the SQL above** to add `firm_name` column
3. **Refresh your Jobs Studio page**
4. **Create a test job** with all the fields filled in
5. **It should work perfectly!** 🎉

## Note About Removed Fields

These fields were in the old code but **don't exist** in your Supabase schema, so I commented them out:

- `priority`, `claim_type`, `policy_number`, `deductible`, `coverage_type`, `estimated_duration`, `tags`, `photos` array

If you want these fields, you'll need to add them to your Supabase schema first.
