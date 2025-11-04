# 🔧 Admin Quick Setup for Mobile App Sync

## 🎯 Quick Solution for Admins

Since you're on the **admin side**, you need to assign jobs to specific users so they appear in the mobile app.

---

## 🚀 Step 1: Find Your Users

Open browser console in Jobs Studio and run:

```javascript
// Get all users from Supabase
const { data: users, error } = await jobsStudio.supabase
  .from("profiles")
  .select("id, email, full_name");
console.table(users);
```

This shows all user IDs in your system.

---

## 🚀 Step 2: Set Default User ID (Quick Fix)

Pick the user ID you want jobs assigned to (usually the mobile app user):

```javascript
// Set default user for all new jobs
localStorage.setItem("user_id", "PASTE-USER-UUID-HERE");

// Example:
localStorage.setItem("user_id", "a1b2c3d4-e5f6-7890-abcd-ef1234567890");
```

---

## 🚀 Step 3: Create Jobs

Now when you create jobs, they'll be assigned to that user and appear in the mobile app!

---

## 🔍 Alternative: Check Existing Jobs

See which users have jobs assigned:

```javascript
const { data: jobs } = await jobsStudio.supabase
  .from("claims")
  .select("claim_number, customer_name, assigned_to, created_at")
  .order("created_at", { ascending: false })
  .limit(20);

console.table(jobs);
```

Jobs from mobile app will have `assigned_to` UUID.
Jobs from Jobs Studio (old) will have `assigned_to` = null.

---

## 💡 Quick Fix for Existing Jobs

Want OLD Jobs Studio jobs to appear in mobile app?

**Option 1: Update ALL jobs to one user:**

```sql
-- Run in Supabase SQL Editor
UPDATE public.claims
SET assigned_to = 'YOUR-USER-UUID'
WHERE assigned_to IS NULL;
```

**Option 2: Check what user mobile app is using:**

In CipherLogin mobile app console:

```javascript
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("Mobile app user:", user.id);
```

Then use that UUID in the UPDATE query above!

---

## ✅ Quick Test

1. Set user ID: `localStorage.setItem("user_id", "UUID-HERE")`
2. Refresh Jobs Studio
3. Create test job
4. Console shows: `👤 Assigned to user ID: UUID-HERE`
5. Open mobile app → job appears! ✅

---

## 🆘 Troubleshooting

**Jobs still not showing?**

Run this diagnostic:

```javascript
// Check localStorage
console.log("User ID set:", localStorage.getItem("user_id"));

// Check mobile app user
// (run in mobile app)
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("Mobile app user:", user.id);

// Check if they match
console.log("Match:", localStorage.getItem("user_id") === user.id);
```

Both IDs must match!

---

## 🎯 Summary

**As Admin:**

1. Get user UUID from mobile app or Supabase dashboard
2. Set in localStorage: `localStorage.setItem("user_id", "UUID")`
3. Create jobs → they appear in mobile app
4. Update old jobs with SQL if needed

**That's it!** 🎉
