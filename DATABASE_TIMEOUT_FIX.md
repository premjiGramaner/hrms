# Database Timeout Error - Fix Guide

## Problem
PostgreSQL connection pool timeout error when querying employees:
```
timeout at pg-pool/index.js:45:11
```

## Root Causes
1. **Connection timeout too short**: `connectionTimeoutMillis: 2000` (2 seconds) is insufficient for large queries
2. **No query timeout set**: Missing query and statement timeout configurations
3. **Possible missing indexes**: Database queries may be slow without proper indexes

## Fixes Applied

### 1. ✅ Updated Database Configuration (db.js)
**File**: `server/src/config/db.js`

**Changes**:
- Increased `connectionTimeoutMillis` from `2000ms` to `10000ms` (10 seconds)
- Added `query_timeout: 60000` (60 seconds)
- Added `statement_timeout: 60000` (60 seconds)

```javascript
const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2000ms
  query_timeout: 60000,           // Added: 60 seconds
  statement_timeout: 60000,       // Added: 60 seconds
});
```

### 2. 🔧 Recommended: Add Database Indexes (Optional but Highly Recommended)

Create these indexes to improve query performance:

```sql
-- Add indexes for frequently searched columns
CREATE INDEX IF NOT EXISTS idx_appusers_first_name ON tbl_appusers(first_name);
CREATE INDEX IF NOT EXISTS idx_appusers_last_name ON tbl_appusers(last_name);
CREATE INDEX IF NOT EXISTS idx_appusers_email ON tbl_appusers(email);
CREATE INDEX IF NOT EXISTS idx_appusers_employee_id ON tbl_appusers(employee_id);
CREATE INDEX IF NOT EXISTS idx_appusers_created_at ON tbl_appusers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appusers_is_active ON tbl_appusers(is_active);

-- Composite index for common search queries
CREATE INDEX IF NOT EXISTS idx_appusers_name_search ON tbl_appusers(name, first_name, last_name);
```

**How to run**:
1. Connect to your PostgreSQL database
2. Run the SQL commands above
3. Restart your server

### 3. 🔄 Restart Required

**IMPORTANT**: You must restart the Node.js server for the configuration changes to take effect.

```bash
# Stop the server (Ctrl+C if running)
# Then restart:
cd server
npm start
```

## Verification

After applying fixes:
1. ✅ Server should restart without errors
2. ✅ Employee list page should load within 10 seconds
3. ✅ No more timeout errors in console

## Additional Troubleshooting

If the issue persists:

### Check Database Connection
```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d hrms
```

### Check if PostgreSQL is Running
```bash
# Windows: Check Services
services.msc
# Look for "postgresql" service

# Or check if port 5432 is listening
netstat -an | findstr :5432
```

### Increase Timeouts Further (if needed)
If your database is very large (>10,000 employees), increase timeouts more:

```javascript
connectionTimeoutMillis: 30000,  // 30 seconds
query_timeout: 120000,           // 2 minutes
statement_timeout: 120000,       // 2 minutes
```

### Check Database Size
```sql
-- Check number of employees
SELECT COUNT(*) FROM tbl_appusers;

-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('tbl_appusers'));
```

## Summary

**Fixed Files**:
- ✅ `server/src/config/db.js` - Increased timeout values

**Next Steps**:
1. Restart the Node.js server
2. Test the employee list page
3. (Optional) Add database indexes for better performance
4. Monitor server logs for any remaining issues

**Expected Result**: The timeout error should be resolved and the application should work normally.
