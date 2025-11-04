# 🔑 User ID Setup for Mobile App Sync

## 🐛 Problem

**Jobs created in Jobs Studio don't appear in CipherLogin mobile app.**

### Root Cause:

- CipherLogin mobile app filters jobs by `assigned_to` field (user UUID)
- Jobs Studio was setting `assigned_to = null`
- Mobile app only shows jobs assigned to the logged-in user
- Since `assigned_to` was null, mobile app filtered them out!

---

## ✅ Solution Implemented

Jobs Studio now automatically tries to get the user ID from:

1. **Supabase auth** (if logged in)
2. **localStorage** `user_id` or `assigned_user_id`

---

## 🚀 Setup Instructions

### **Step 1: Get Your User ID from CipherLogin Mobile App**

You need your UUID from the mobile app. Run this in the mobile app's browser console:

```javascript
// In CipherLogin mobile app, open DevTools and run:
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("Your User ID:", user.id);
```

Copy the UUID (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

---

### **Step 2: Set User ID in Jobs Studio**

Open Jobs Studio browser console and run:

```javascript
// Replace with YOUR user ID from Step 1
localStorage.setItem("user_id", "YOUR-UUID-HERE");

// Example:
localStorage.setItem("user_id", "a1b2c3d4-e5f6-7890-abcd-ef1234567890");
```

---

### **Step 3: Verify It's Set**

```javascript
console.log("User ID:", localStorage.getItem("user_id"));
```

---

### **Step 4: Refresh Jobs Studio**

Now when you create a job, it will be assigned to your user ID!

---

## 🧪 Testing

1. **Set your user ID** in localStorage (Step 2)
2. **Refresh Jobs Studio**
3. **Create a new job** with the Generate button
4. **Check console** - should see: `👤 Assigned to user ID: your-uuid-here`
5. **Open CipherLogin mobile app**
6. **Refresh** - job should appear! ✅

---

## 🔍 Alternative: Find User ID in Supabase

If you can't access the mobile app console:

1. **Go to Supabase Dashboard**
2. **Click "Authentication" → "Users"**
3. **Find your email**
4. **Copy the UUID** from the ID column
5. **Use that UUID** in Step 2 above

---

## 📊 Verify Jobs Have User ID

Check if jobs have assigned_to set:

```sql
-- Run in Supabase SQL Editor
SELECT
    claim_number,
    customer_name,
    assigned_to,
    created_at
FROM public.claims
ORDER BY created_at DESC
LIMIT 10;
```

Jobs created from mobile app should have `assigned_to` UUID.
Jobs created from Jobs Studio (after fix) should also have it!

---

## 🔄 Update Existing Jobs (Optional)

If you want OLD Jobs Studio jobs to appear in mobile app:

```sql
-- Run in Supabase SQL Editor
-- Replace YOUR-USER-ID with your UUID
UPDATE public.claims
SET assigned_to = 'YOUR-USER-ID'
WHERE assigned_to IS NULL;

-- Example:
UPDATE public.claims
SET assigned_to = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
WHERE assigned_to IS NULL;
```

---

## 🎯 What Changed in Code

**File:** `scripts/jobs-studio.js` → `createNewJob()` method

**Before:**

```javascript
assigned_to: null, // ❌ Mobile app can't see these
```

**After:**

```javascript
// ✅ Try to get user ID from auth or localStorage
let assignedUserId = null;

if (this.supabase) {
  const { data: { user } } = await this.supabase.auth.getUser();
  if (user) {
    assignedUserId = user.id; // From Supabase auth
  } else {
    assignedUserId = localStorage.getItem("user_id"); // From localStorage
  }
}

assigned_to: assignedUserId, // ✅ Mobile app will show these!
```

---

## 💡 Pro Tips

### **For Development:**

Set a test user ID in localStorage:

```javascript
localStorage.setItem("user_id", "test-user-123");
```

### **For Multiple Users:**

Each person needs to set THEIR user ID in localStorage on their browser.

### **For Production:**

Implement proper login so Supabase auth automatically provides the user ID.

---

## ✅ Summary

**Problem:** Jobs Studio jobs had `assigned_to = null`  
**Solution:** Auto-detect user ID from auth or localStorage  
**Action:** Set your user ID with `localStorage.setItem("user_id", "YOUR-UUID")`  
**Result:** Jobs Studio jobs now appear in CipherLogin mobile app! 🎉

---

## 🆘 Troubleshooting

### Jobs still not appearing?

1. **Check user ID is set:**

   ```javascript
   console.log(localStorage.getItem("user_id"));
   ```

2. **Check job has assigned_to:**

   - Create test job
   - Open browser console
   - Look for: `👤 Assigned to user ID: ...`
   - Should NOT be null

3. **Check mobile app user ID matches:**

   - In mobile app: `(await supabase.auth.getUser()).data.user.id`
   - Must match localStorage user_id

4. **Check Supabase connection:**

   - Both apps must use SAME Supabase project
   - Verify URL in localStorage: `localStorage.getItem("supabase_url")`

5. **Check mobile app filter:**
   - Mobile app might be filtering by other fields
   - Check status (must be NEW/SCHEDULED/IN_PROGRESS/COMPLETED)
   - Check if mobile app filters by date range
