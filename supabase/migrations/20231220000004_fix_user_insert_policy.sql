-- Fix user INSERT policy to allow signup
-- This policy allows users to insert their own record, which is needed for the trigger function
-- that syncs auth.users to public.users

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert own data" ON users;

-- Create INSERT policy that allows users to insert their own record
-- This works with the trigger function handle_new_user() which inserts with auth.uid() = id
-- The trigger function runs with SECURITY DEFINER, but RLS is still enforced, so we need this policy
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
