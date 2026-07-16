# Fix 403 Forbidden Error - HR Admin Module

## Problem
```
Failed to load resource: the server responded with a status of 403 (Forbidden)
/api/hradmin/job-titles:1
```

## Root Cause
The logged-in user **does not have HR Admin permissions**. The HR Admin module requires either:
- Role: `"hradmin"` (HR Administrator), OR
- Role: `"empmanager"` (Employee Manager)

Your current user likely has role: `"employee"` (regular employee)

## Quick Fix Steps

### Step 1: Check Your Current Role

**Option A: Using pgAdmin or SQL Client**
```sql
-- Find your user and check the role
SELECT id, username, email, role, name, is_active
FROM tbl_appusers
WHERE username = 'YOUR_USERNAME_HERE';
-- Replace YOUR_USERNAME_HERE with your actual username
```

**Option B: Check in Browser Console**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `localStorage.getItem('user')`
4. Look for the `"role"` field

### Step 2: Grant HR Admin Access

Connect to your PostgreSQL database and run:

```sql
-- Update your user's role to hradmin
UPDATE tbl_appusers
SET role = 'hradmin'
WHERE username = 'YOUR_USERNAME_HERE';
-- Replace YOUR_USERNAME_HERE with your actual username
```

**Or use user ID:**
```sql
UPDATE tbl_appusers
SET role = 'hradmin'
WHERE id = 1;  -- Replace 1 with your user ID
```

### Step 3: Verify the Change
```sql
SELECT id, username, email, role, name
FROM tbl_appusers
WHERE username = 'YOUR_USERNAME_HERE';
```

You should see `role: hradmin` in the result.

### Step 4: ⚠️ IMPORTANT - Logout and Login Again

**You MUST logout and login again** for the role change to take effect!

1. Click the Logout button in the application
2. Login again with the same credentials
3. Try accessing HR Administration again

## Why Logout is Required

The JWT token contains your user role. When you login:
1. Server creates a JWT with your current role
2. Token is stored in browser
3. All API requests use this token

If you change the role in database but don't logout:
- Old JWT token still has the old role
- Server checks the JWT token role (not database)
- You still get 403 Forbidden

## Available Roles

| Role | Access Level | HR Admin Access |
|------|-------------|-----------------|
| `hradmin` | HR Administrator | ✅ Full Access |
| `empmanager` | Employee Manager | ✅ Full Access |
| `employee` | Regular Employee | ❌ No Access |

## Alternative: Quick Test SQL Script

Run this script to fix the admin user (ID = 1):

```sql
-- Grant hradmin role to user ID 1
UPDATE tbl_appusers
SET role = 'hradmin'
WHERE id = 1;

-- Verify
SELECT id, username, role FROM tbl_appusers WHERE id = 1;
```

## Troubleshooting

### Still Getting 403 After Logout/Login?

1. **Clear browser cache and cookies:**
   - Chrome: Ctrl+Shift+Delete
   - Select "Cookies and other site data"
   - Click "Clear data"

2. **Check the token in DevTools:**
   ```javascript
   // Open Browser Console (F12)
   // Check localStorage
   localStorage.getItem('user')
   
   // Should show: {"role":"hradmin", ...}
   ```

3. **Verify database change persisted:**
   ```sql
   SELECT username, role FROM tbl_appusers WHERE username = 'YOUR_USERNAME';
   ```

### Multiple Users Need HR Admin Access?

```sql
-- Grant hradmin to multiple users
UPDATE tbl_appusers
SET role = 'hradmin'
WHERE username IN ('admin', 'hr_manager', 'john_doe');

-- Verify
SELECT username, role FROM tbl_appusers 
WHERE role IN ('hradmin', 'empmanager');
```

## For Development/Testing

If you want to test with different roles:

```sql
-- Create a test HR admin user
INSERT INTO tbl_appusers (
  username, email, password, role, 
  first_name, last_name, name, is_active
)
VALUES (
  'hradmin_test',
  'hradmin@test.com',
  '$2b$10$hashedpasswordhere', -- You'll need to hash this
  'hradmin',
  'HR',
  'Admin',
  'HR Admin',
  true
);
```

## Quick Verification Checklist

- [ ] Confirmed current user role is `"employee"`
- [ ] Updated user role to `"hradmin"` in database
- [ ] Verified the UPDATE query succeeded
- [ ] Logged out of the application
- [ ] Logged back in with same credentials
- [ ] Checked that new JWT contains `"hradmin"` role
- [ ] HR Admin module now accessible

## Summary

**Problem**: 403 Forbidden error on HR Admin pages
**Cause**: User role is `"employee"`, not `"hradmin"` or `"empmanager"`
**Solution**: 
1. Update user role in database to `"hradmin"`
2. **Logout and login again** (most important step!)
3. HR Admin access granted

## Need Help?

If the issue persists after following these steps:
1. Check server logs for any authentication errors
2. Verify PostgreSQL is running and accessible
3. Ensure the auth middleware is properly loaded
4. Check that JWT_SECRET in .env matches between deployments
