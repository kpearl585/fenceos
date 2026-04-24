# E2E Test Setup Guide
**Last Updated:** April 13, 2026  
**Status:** Ready for test user creation

---

## Quick Start

### Option A: Supabase Dashboard (Recommended - 2 minutes)

1. **Open Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/kgwfqyhfylfzizfzeulv
   ```

2. **Navigate to Authentication → Users**

3. **Click "Add User" → "Create New User"**

4. **Enter Test Credentials:**
   ```
   Email: e2e-test@fenceestimatepro.com
   Password: E2ETest123!SecurePassword
   Auto Confirm: ✅ ENABLED (skip email confirmation)
   ```

5. **Save User**

6. **Create `.env.test` file** (in project root):
   ```bash
   # E2E Testing Environment Variables
   TEST_USER_EMAIL=e2e-test@fenceestimatepro.com
   TEST_USER_PASSWORD=E2ETest123!SecurePassword
   ```

7. **Run tests:**
   ```bash
   npm run test:e2e
   ```

**Done!** The app will auto-create org + profile on first login.

---

### Option B: SQL (If Dashboard Access Unavailable)

Run this SQL in Supabase SQL Editor:

```sql
-- Create test user in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'e2e-test@fenceestimatepro.com',
  crypt('E2ETest123!SecurePassword', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Verify user created
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'e2e-test@fenceestimatepro.com';
```

Then create `.env.test` as in Option A.

---

## What Happens on First Login

The test user will trigger automatic setup:

1. **Login:** Test logs in via Supabase Auth
2. **Profile Creation:** `ensureProfile()` detects missing profile
3. **Org Creation:** Creates organization: "e2e-test's Org"
4. **User Record:** Creates `public.users` row with role='owner'
5. **Materials Seed:** Seeds default materials catalog (if empty)
6. **Redirect:** Redirects to `/dashboard`

**All automatic. No manual database setup required.**

---

## Environment Variables Required

### .env.test
```bash
# Test User Credentials (must exist in Supabase Auth)
TEST_USER_EMAIL=e2e-test@fenceestimatepro.com
TEST_USER_PASSWORD=E2ETest123!SecurePassword
```

### .env.local (Already configured)
```bash
# Supabase connection (shared with tests)
NEXT_PUBLIC_SUPABASE_URL=https://kgwfqyhfylfzizfzeulv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## Verification

### 1. Test User Exists
```sql
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'e2e-test@fenceestimatepro.com';
```
**Expected:** 1 row, `email_confirmed_at` NOT NULL

### 2. Profile Auto-Created (After First Test Run)
```sql
SELECT u.id, u.email, u.role, u.org_id, o.name as org_name
FROM users u
JOIN organizations o ON o.id = u.org_id
WHERE u.email = 'e2e-test@fenceestimatepro.com';
```
**Expected:** 1 row, role='owner', org_name="e2e-test's Org"

### 3. Run Single Test
```bash
npm run test:e2e -- --grep "should load advanced estimate page"
```
**Expected:** Test passes, no auth errors

---

## Troubleshooting

### "Invalid login credentials"
- ✅ Verify test user exists in `auth.users`
- ✅ Check `email_confirmed_at` is NOT NULL
- ✅ Verify password matches `.env.test`
- ✅ Check `.env.test` file exists and is loaded

### "Organization not found"
- ✅ This is normal on FIRST login
- ✅ `ensureProfile()` will create it automatically
- ✅ Re-run test, should pass second time

### "RLS policy violation"
- ✅ Verify user has `org_id` in `public.users`
- ✅ Check RLS policies are enabled
- ✅ Ensure test user role is 'owner'

### Tests timeout waiting for dashboard
- ✅ Check dev server is running (`npm run dev`)
- ✅ Verify `http://localhost:3000/login` loads
- ✅ Try manual login with test credentials
- ✅ Check browser console for errors

---

## Test User Requirements Summary

| Requirement | Where | Auto-Created |
|-------------|-------|--------------|
| **Supabase Auth User** | `auth.users` table | ❌ Manual |
| **Email Confirmed** | `email_confirmed_at` NOT NULL | ❌ Manual |
| **Organization** | `public.organizations` | ✅ On first login |
| **User Profile** | `public.users` | ✅ On first login |
| **Role** | `users.role = 'owner'` | ✅ On first login |
| **Materials Catalog** | `public.materials` | ✅ On first login |

**Only need to create:** Supabase Auth user (1 step)  
**Everything else:** Auto-created by app

---

## Security Notes

- ✅ Test user is isolated to test org
- ✅ RLS policies prevent cross-org access
- ✅ Test user cannot access production data
- ✅ Can safely delete test user after testing

---

## Next Steps After Setup

1. Create test user (Option A or B above)
2. Create `.env.test` file
3. Run `npm run test:e2e`
4. Verify tests pass
5. Add more critical path tests if needed

**Setup time:** 2-5 minutes  
**Test execution:** ~30 seconds per test
