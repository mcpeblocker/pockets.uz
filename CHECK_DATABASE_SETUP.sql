-- ============================================================================
-- DATABASE SETUP DIAGNOSTIC SCRIPT
-- ============================================================================
-- Run this in Supabase SQL Editor to check if your database is configured
-- correctly for user signup. This will help identify what's missing.
-- ============================================================================

-- 1. Check if users table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public')
    THEN '✅ users table exists'
    ELSE '❌ users table MISSING'
  END as table_check;

-- 2. Check if RLS is enabled on users table
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'users'
    ) AND (
      SELECT relrowsecurity FROM pg_class 
      WHERE relname = 'users' 
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) = true
    THEN '✅ RLS is enabled on users table'
    ELSE '❌ RLS is NOT enabled on users table'
  END as rls_check;

-- 3. Check if the critical INSERT policy exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' 
      AND policyname = 'Users can insert own data'
    )
    THEN '✅ INSERT policy exists'
    ELSE '❌ INSERT policy MISSING - Run FIX_USER_POLICY.sql'
  END as insert_policy_check;

-- 4. Check if UPDATE policy exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' 
      AND policyname = 'Users can update own data'
    )
    THEN '✅ UPDATE policy exists'
    ELSE '❌ UPDATE policy MISSING'
  END as update_policy_check;

-- 5. Check if the trigger exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'on_auth_user_created'
    )
    THEN '✅ User sync trigger exists'
    ELSE '❌ User sync trigger MISSING'
  END as trigger_check;

-- 6. Check if the trigger function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'handle_new_user'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    )
    THEN '✅ handle_new_user function exists'
    ELSE '❌ handle_new_user function MISSING'
  END as function_check;

-- 7. Show all policies on users table
SELECT 
  policyname,
  cmd as command,
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN '✅'
    ELSE '❌'
  END as status
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 8. Show trigger details
SELECT 
  tgname as trigger_name,
  tgtype::text as trigger_type,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Enabled'
    WHEN tgenabled = 'D' THEN '❌ Disabled'
    ELSE '⚠️ ' || tgenabled::text
  END as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- If you see any ❌ marks above, you need to:
-- 1. Run FIX_USER_POLICY.sql to fix INSERT/UPDATE policies
-- 2. Run the full migration (00000000000000_complete_schema.sql) to fix triggers
-- ============================================================================
