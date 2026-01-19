# Database Setup Guide

This guide explains how to set up the Pockets database schema in Supabase.

## Quick Start

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Run the Migration**
   - Open the file: `supabase/migrations/00000000000000_complete_schema.sql`
   - Copy the **entire contents** of the file
   - Paste into the SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

4. **Verify Migration**
   - The migration should complete without errors
   - You should see "Success. No rows returned"

## What This Migration Does

The migration creates a complete database schema including:

### Core Tables
- **users** - User accounts
- **events** - Expense events/sessions
- **participants** - People participating in events
- **expenses** - Individual expenses
- **settlements** - Who owes whom

### V2 Features
- **expense_categories** - Categorize expenses
- **expense_splits** - Custom expense splitting
- **receipts** - Attach receipts to expenses
- **settlement_transactions** - Track settlement payments
- **event_history** - Audit trail

### V3 Features
- **groups** - Organize people who frequently split expenses
- **group_members** - Group membership with roles (admin/member)
- **device_sessions** - Track active devices per user
- **auth_providers** - OAuth support (future)

### Security
- **Row Level Security (RLS)** - Enabled on all tables
- **Policies** - Comprehensive access control
- **Triggers** - Auto-sync auth users, audit fields

### Key Features
- **User signup** - Automatic user creation via trigger
- **Permissions** - Role-based access (owner/admin/member)
- **Audit trail** - created_by, updated_by, version fields
- **Groups** - Long-lived expense groups

## Important Notes

### Idempotent Migration
The migration is **idempotent** - it's safe to run multiple times. It uses `IF NOT EXISTS` and `DROP POLICY IF EXISTS` to prevent errors.

### Critical Policy
The migration includes the **critical user INSERT policy** that allows signup to work:
```sql
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

Without this policy, user signup will fail with "Permission denied" errors.

### Email Verification
After running the migration, check your Supabase email settings:
- **Dashboard > Authentication > Providers > Email**
- Configure whether email confirmation is required

## Troubleshooting

### Error: "relation already exists"
This is normal if you've run parts of the migration before. The migration handles this with `IF NOT EXISTS`.

### Error: "permission denied"
Make sure you're running the migration in the Supabase Dashboard SQL Editor (not via API). The Dashboard has full admin access.

### Error: "policy already exists"
The migration uses `DROP POLICY IF EXISTS` before creating policies, so this shouldn't happen. If it does, the migration will still work.

### Users can't sign up
1. **Quick Fix**: Run the `FIX_USER_POLICY.sql` file in Supabase SQL Editor
   - This will add the missing user INSERT policy
   - File location: `FIX_USER_POLICY.sql` in the project root

2. **Manual Verification**: Check if the policy exists:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'users' 
   AND policyname = 'Users can insert own data';
   ```
   - If it returns no rows, the policy is missing - run `FIX_USER_POLICY.sql`
   - If it returns 1 row, the policy exists - the issue might be elsewhere

3. **Alternative**: If the quick fix doesn't work, run the full migration again:
   - Copy `supabase/migrations/00000000000000_complete_schema.sql`
   - Run it in Supabase SQL Editor (it's idempotent, safe to run multiple times)

### Migration takes a long time
This is normal for the first run. The migration creates many tables, indexes, policies, and triggers. Subsequent runs will be faster.

## Verification Queries

After running the migration, you can verify it worked:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'users', 'events', 'participants', 'expenses', 'settlements',
  'expense_categories', 'expense_splits', 'receipts',
  'settlement_transactions', 'event_history',
  'groups', 'group_members', 'device_sessions', 'auth_providers'
)
ORDER BY table_name;

-- Check if critical policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'users' 
AND policyname = 'Users can insert own data';

-- Check if trigger exists
SELECT * FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

## Next Steps

After running the migration:

1. **Test Signup** - Try creating a new account
2. **Test Event Creation** - Create a test event
3. **Check Email Settings** - Configure email verification if needed
4. **Verify Permissions** - Test that users can only access their own data

## Support

If you encounter issues:
1. Check the Supabase Dashboard logs
2. Verify all tables were created
3. Check that RLS policies exist
4. Ensure the user sync trigger is active
