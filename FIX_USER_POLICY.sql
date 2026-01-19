-- ============================================================================
-- QUICK FIX: Add Missing User INSERT Policy
-- ============================================================================
-- Run this in Supabase SQL Editor if you're getting "Database configuration error"
-- during signup. This adds the critical policy that allows users to insert
-- their own record during signup.
-- ============================================================================

-- Enable RLS on users table (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop the policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert own data" ON users;

-- Create the critical INSERT policy
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Also ensure UPDATE policy exists
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND policyname = 'Users can insert own data';

-- Expected result: Should return 1 row showing the policy exists
