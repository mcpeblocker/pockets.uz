-- ============================================================================
-- COMPLETE DATABASE SCHEMA MIGRATION
-- ============================================================================
-- This migration contains all necessary database changes for Pockets
-- It is idempotent - safe to run multiple times
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CORE TABLES
-- ============================================================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  telegram_id TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table (without group_id initially, will add after groups table)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  email_note TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_owner_id ON events(owner_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
-- Note: idx_events_group_id will be created after groups table exists

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add participant_token column (V2 feature) - must be added before UPDATE
ALTER TABLE participants ADD COLUMN IF NOT EXISTS participant_token TEXT;

-- Generate tokens for existing participants if needed (only if column exists and is null)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' 
    AND column_name = 'participant_token'
  ) THEN
    UPDATE participants 
    SET participant_token = gen_random_uuid()::TEXT 
    WHERE participant_token IS NULL;
  END IF;
END $$;

-- Make participant_token unique (after generating values)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'participants_participant_token_key'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' 
    AND column_name = 'participant_token'
  ) THEN
    ALTER TABLE participants ADD CONSTRAINT participants_participant_token_key UNIQUE (participant_token);
  END IF;
END $$;

-- Add V3 fields to participants (idempotent)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_created_by ON participants(created_by);

-- Prevent duplicate participants (same email in same event)
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_event_email_unique 
ON participants(event_id, LOWER(email)) 
WHERE email IS NOT NULL;

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  paid_by_participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add V2 fields to expenses (idempotent)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category_id UUID;

-- Add V3 fields to expenses (idempotent)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_expenses_event_id ON expenses(event_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by_participant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);

-- Create settlements table
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  to_participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  from_name TEXT NOT NULL,
  to_name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add V3 fields to settlements (idempotent)
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_settlements_event_id ON settlements(event_id);

-- ============================================================================
-- 2. V2 FEATURES (Custom Splits, Categories, Receipts)
-- ============================================================================

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, name)
);

-- Add V3 field (idempotent)
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expense_categories_event_id ON expense_categories(event_id);

-- Add foreign key constraint for expenses.category_id (after both tables exist)
DO $$ 
BEGIN
  -- Check if column exists, table exists, and constraint doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' 
    AND column_name = 'category_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'expense_categories'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'expenses_category_id_fkey'
  ) THEN
    ALTER TABLE expenses ADD CONSTRAINT expenses_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create expense_splits table for custom splitting
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) CHECK (amount >= 0),
  percentage DECIMAL(5, 2) CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(expense_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_participant_id ON expense_splits(expense_id);

-- Create receipts table for expense attachments
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_expense_id ON receipts(expense_id);

-- Create settlement_transactions table
CREATE TABLE IF NOT EXISTS settlement_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_transactions_settlement_id ON settlement_transactions(settlement_id);

-- Create event_history table for audit trail
CREATE TABLE IF NOT EXISTS event_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_history_event_id ON event_history(event_id);
CREATE INDEX IF NOT EXISTS idx_event_history_created_at ON event_history(created_at);

-- ============================================================================
-- 3. V3 FEATURES (Groups, Permissions, Device Sessions)
-- ============================================================================

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_groups_owner_id ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);

-- Now add group_id to events table (after groups table exists)
ALTER TABLE events ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_events_group_id ON events(group_id);

-- Create group_members table with roles
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);

-- Create device_sessions table
CREATE TABLE IF NOT EXISTS device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  user_agent TEXT,
  ip_address TEXT,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id ON device_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_device_id ON device_sessions(device_id);

-- Create auth_providers table (for future OAuth)
CREATE TABLE IF NOT EXISTS auth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_providers_user_id ON auth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_providers_provider ON auth_providers(provider);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_providers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. USERS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- CRITICAL: Allow users to insert their own record (needed for signup)
DROP POLICY IF EXISTS "Users can insert own data" ON users;
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 6. EVENTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Events are publicly readable" ON events;
CREATE POLICY "Events are publicly readable" ON events
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create events" ON events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
CREATE POLICY "Users can create events" ON events
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = events.group_id
      AND group_members.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Group members can update events" ON events;
DROP POLICY IF EXISTS "Event owners can update events" ON events;
CREATE POLICY "Group members can update events" ON events
  FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = events.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role IN ('admin', 'member')
    ))
  );

DROP POLICY IF EXISTS "Event owners can delete events" ON events;
CREATE POLICY "Event owners can delete events" ON events
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- 7. PARTICIPANTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Participants are publicly readable" ON participants;
CREATE POLICY "Participants are publicly readable" ON participants
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can join events" ON participants;
CREATE POLICY "Anyone can join events" ON participants
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Event owners can update participants" ON participants;
CREATE POLICY "Event owners can update participants" ON participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = participants.event_id
      AND events.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Event owners can delete participants" ON participants;
CREATE POLICY "Event owners can delete participants" ON participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = participants.event_id
      AND events.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. EXPENSES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Expenses are publicly readable" ON expenses;
CREATE POLICY "Expenses are publicly readable" ON expenses
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Group members can create expenses" ON expenses;
DROP POLICY IF EXISTS "Event owners can create expenses" ON expenses;
CREATE POLICY "Group members can create expenses" ON expenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = expenses.event_id
      AND (
        events.owner_id = auth.uid() OR
        (events.group_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM group_members
          WHERE group_members.group_id = events.group_id
          AND group_members.user_id = auth.uid()
        ))
      )
    )
  );

DROP POLICY IF EXISTS "Group members can update expenses" ON expenses;
DROP POLICY IF EXISTS "Event owners can update expenses" ON expenses;
CREATE POLICY "Group members can update expenses" ON expenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = expenses.event_id
      AND (
        events.owner_id = auth.uid() OR
        (events.group_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM group_members
          WHERE group_members.group_id = events.group_id
          AND group_members.user_id = auth.uid()
          AND (
            group_members.role = 'admin' OR
            expenses.created_by = auth.uid()
          )
        ))
      )
    )
  );

DROP POLICY IF EXISTS "Admins and owners can delete expenses" ON expenses;
DROP POLICY IF EXISTS "Event owners can delete expenses" ON expenses;
CREATE POLICY "Admins and owners can delete expenses" ON expenses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = expenses.event_id
      AND (
        events.owner_id = auth.uid() OR
        (events.group_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM group_members
          WHERE group_members.group_id = events.group_id
          AND group_members.user_id = auth.uid()
          AND group_members.role = 'admin'
        ))
      )
    )
  );

-- ============================================================================
-- 9. SETTLEMENTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Settlements are publicly readable" ON settlements;
CREATE POLICY "Settlements are publicly readable" ON settlements
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Event owners can create settlements" ON settlements;
CREATE POLICY "Event owners can create settlements" ON settlements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = settlements.event_id
      AND events.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Event owners can update settlements" ON settlements;
CREATE POLICY "Event owners can update settlements" ON settlements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = settlements.event_id
      AND events.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Event owners can delete settlements" ON settlements;
CREATE POLICY "Event owners can delete settlements" ON settlements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = settlements.event_id
      AND events.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 10. V2 TABLES POLICIES
-- ============================================================================

-- Expense categories
DROP POLICY IF EXISTS "Expense categories are publicly readable" ON expense_categories;
CREATE POLICY "Expense categories are publicly readable" ON expense_categories
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Event owners can manage expense categories" ON expense_categories;
CREATE POLICY "Event owners can manage expense categories" ON expense_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = expense_categories.event_id
      AND events.owner_id = auth.uid()
    )
  );

-- Expense splits
DROP POLICY IF EXISTS "Expense splits are publicly readable" ON expense_splits;
CREATE POLICY "Expense splits are publicly readable" ON expense_splits
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Event owners can manage expense splits" ON expense_splits;
CREATE POLICY "Event owners can manage expense splits" ON expense_splits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      JOIN expenses ON expenses.event_id = events.id
      WHERE expenses.id = expense_splits.expense_id
      AND events.owner_id = auth.uid()
    )
  );

-- Receipts
DROP POLICY IF EXISTS "Receipts are publicly readable" ON receipts;
CREATE POLICY "Receipts are publicly readable" ON receipts
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Event owners can manage receipts" ON receipts;
CREATE POLICY "Event owners can manage receipts" ON receipts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      JOIN expenses ON expenses.event_id = events.id
      WHERE expenses.id = receipts.expense_id
      AND events.owner_id = auth.uid()
    )
  );

-- Settlement transactions
DROP POLICY IF EXISTS "Settlement transactions are publicly readable" ON settlement_transactions;
CREATE POLICY "Settlement transactions are publicly readable" ON settlement_transactions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Event owners can manage settlement transactions" ON settlement_transactions;
CREATE POLICY "Event owners can manage settlement transactions" ON settlement_transactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      JOIN settlements ON settlements.event_id = events.id
      WHERE settlements.id = settlement_transactions.settlement_id
      AND events.owner_id = auth.uid()
    )
  );

-- Event history
DROP POLICY IF EXISTS "Event history is publicly readable" ON event_history;
CREATE POLICY "Event history is publicly readable" ON event_history
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Event owners can create event history" ON event_history;
CREATE POLICY "Event owners can create event history" ON event_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_history.event_id
      AND events.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 11. V3 GROUPS POLICIES
-- ============================================================================

-- Groups
DROP POLICY IF EXISTS "Group members can read groups" ON groups;
CREATE POLICY "Group members can read groups" ON groups
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create groups" ON groups;
CREATE POLICY "Users can create groups" ON groups
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Group owners and admins can update groups" ON groups;
CREATE POLICY "Group owners and admins can update groups" ON groups
  FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Group owners can delete groups" ON groups;
CREATE POLICY "Group owners can delete groups" ON groups
  FOR DELETE
  USING (owner_id = auth.uid());

-- Group members
DROP POLICY IF EXISTS "Users can read their group memberships" ON group_members;
CREATE POLICY "Users can read their group memberships" ON group_members
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND (groups.owner_id = auth.uid() OR
           EXISTS (
             SELECT 1 FROM group_members gm
             WHERE gm.group_id = groups.id
             AND gm.user_id = auth.uid()
             AND gm.role = 'admin'
           ))
    )
  );

DROP POLICY IF EXISTS "Group owners and admins can add members" ON group_members;
CREATE POLICY "Group owners and admins can add members" ON group_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND (groups.owner_id = auth.uid() OR
           EXISTS (
             SELECT 1 FROM group_members gm
             WHERE gm.group_id = groups.id
             AND gm.user_id = auth.uid()
             AND gm.role = 'admin'
           ))
    )
  );

DROP POLICY IF EXISTS "Group owners and admins can update members" ON group_members;
CREATE POLICY "Group owners and admins can update members" ON group_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND (groups.owner_id = auth.uid() OR
           EXISTS (
             SELECT 1 FROM group_members gm
             WHERE gm.group_id = groups.id
             AND gm.user_id = auth.uid()
             AND gm.role = 'admin'
           ))
    )
  );

DROP POLICY IF EXISTS "Group owners and admins can remove members" ON group_members;
CREATE POLICY "Group owners and admins can remove members" ON group_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.owner_id != group_members.user_id
      AND (groups.owner_id = auth.uid() OR
           EXISTS (
             SELECT 1 FROM group_members gm
             WHERE gm.group_id = groups.id
             AND gm.user_id = auth.uid()
             AND gm.role = 'admin'
           ))
    )
  );

-- Device sessions
DROP POLICY IF EXISTS "Users can manage their own device sessions" ON device_sessions;
CREATE POLICY "Users can manage their own device sessions" ON device_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auth providers
DROP POLICY IF EXISTS "Users can manage their own auth providers" ON auth_providers;
CREATE POLICY "Users can manage their own auth providers" ON auth_providers
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 12. TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Sync existing auth users
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT id, email, created_at, updated_at
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  updated_at = EXCLUDED.updated_at;

-- Helper functions for groups
CREATE OR REPLACE FUNCTION is_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM groups
    WHERE id = p_group_id
    AND owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
    AND user_id = p_user_id
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
    AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM groups
    WHERE id = p_group_id
    AND owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit field functions
CREATE OR REPLACE FUNCTION update_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  IF TG_OP = 'UPDATE' AND OLD.version IS NOT NULL THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for audit fields
DROP TRIGGER IF EXISTS update_events_audit ON events;
CREATE TRIGGER update_events_audit
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_fields();

DROP TRIGGER IF EXISTS update_expenses_audit ON expenses;
CREATE TRIGGER update_expenses_audit
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_fields();

DROP TRIGGER IF EXISTS update_groups_audit ON groups;
CREATE TRIGGER update_groups_audit
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_fields();

-- Function to set created_by on insert
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for created_by
DROP TRIGGER IF EXISTS set_events_created_by ON events;
CREATE TRIGGER set_events_created_by
  BEFORE INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS set_expenses_created_by ON expenses;
CREATE TRIGGER set_expenses_created_by
  BEFORE INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

DROP TRIGGER IF EXISTS set_groups_created_by ON groups;
CREATE TRIGGER set_groups_created_by
  BEFORE INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
