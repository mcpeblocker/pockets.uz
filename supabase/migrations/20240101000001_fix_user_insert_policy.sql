-- Fix: Add INSERT policy for users table
-- This allows authenticated users to create their own user record
-- This is needed for the ensureUserExists function to work

-- Allow authenticated users to insert their own user record
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
