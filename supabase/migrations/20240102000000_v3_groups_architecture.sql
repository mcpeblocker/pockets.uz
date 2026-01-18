-- V3 Architecture: Groups, Permissions, Audit, and Sync
-- This migration adds the new architecture while maintaining backward compatibility

-- ============================================
-- 1. GROUPS & GROUP MEMBERS
-- ============================================

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}', -- Flexible settings storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  version INTEGER DEFAULT 1 -- For sync/conflict resolution
);

CREATE INDEX IF NOT EXISTS idx_groups_owner_id ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);

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

-- ============================================
-- 2. DEVICE SESSIONS
-- ============================================

-- Create device_sessions table for tracking active devices
CREATE TABLE IF NOT EXISTS device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL, -- Unique device identifier
  device_name TEXT, -- User-friendly device name
  user_agent TEXT,
  ip_address TEXT,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id ON device_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_device_id ON device_sessions(device_id);

-- ============================================
-- 3. ADD AUDIT FIELDS TO EXISTING TABLES
-- ============================================

-- Events: Add group_id, created_by, updated_by, version
ALTER TABLE events ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_events_group_id ON events(group_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

-- Expenses: Add created_by, updated_by, version
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);

-- Participants: Add created_by, updated_by
ALTER TABLE participants ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_participants_created_by ON participants(created_by);

-- Settlements: Add created_by, updated_by
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Expense categories: Add created_by
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- 4. AUTH PROVIDERS (for future OAuth)
-- ============================================

-- Create auth_providers table for OAuth
CREATE TABLE IF NOT EXISTS auth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google', 'github', 'email', etc.
  provider_user_id TEXT NOT NULL, -- External provider's user ID
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_providers_user_id ON auth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_providers_provider ON auth_providers(provider);

-- ============================================
-- 5. ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_providers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS POLICIES FOR GROUPS
-- ============================================

-- Groups: Members can read their groups
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

-- Groups: Owners can create groups
CREATE POLICY "Users can create groups" ON groups
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Groups: Owners and admins can update
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

-- Groups: Only owners can delete
CREATE POLICY "Group owners can delete groups" ON groups
  FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================
-- 7. RLS POLICIES FOR GROUP MEMBERS
-- ============================================

-- Group members: Members can read their group memberships
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

-- Group members: Owners and admins can add members
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

-- Group members: Owners and admins can update roles
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

-- Group members: Owners and admins can remove members (except owner)
CREATE POLICY "Group owners and admins can remove members" ON group_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.owner_id != group_members.user_id -- Can't remove owner
      AND (groups.owner_id = auth.uid() OR
           EXISTS (
             SELECT 1 FROM group_members gm
             WHERE gm.group_id = groups.id
             AND gm.user_id = auth.uid()
             AND gm.role = 'admin'
           ))
    )
  );

-- ============================================
-- 8. RLS POLICIES FOR DEVICE SESSIONS
-- ============================================

-- Device sessions: Users can only see their own sessions
CREATE POLICY "Users can manage their own device sessions" ON device_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 9. RLS POLICIES FOR AUTH PROVIDERS
-- ============================================

-- Auth providers: Users can only see their own providers
CREATE POLICY "Users can manage their own auth providers" ON auth_providers
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 10. UPDATE EXISTING POLICIES FOR PERMISSIONS
-- ============================================

-- Events: Group members can create events in their groups
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

-- Events: Group members can update events in their groups
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

-- Expenses: Group members can add expenses
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

-- Expenses: Group members can update expenses (with restrictions)
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
          -- Members can only edit their own expenses, admins can edit any
          AND (
            group_members.role = 'admin' OR
            expenses.created_by = auth.uid()
          )
        ))
      )
    )
  );

-- Expenses: Only admins and owners can delete
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

-- ============================================
-- 11. HELPER FUNCTIONS
-- ============================================

-- Function to check if user is group admin
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

-- Function to check if user is group member
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

-- Function to automatically set updated_by and version
CREATE OR REPLACE FUNCTION update_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  IF TG_OP = 'UPDATE' THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for audit fields
CREATE TRIGGER update_events_audit
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_fields();

CREATE TRIGGER update_expenses_audit
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_fields();

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

-- Create triggers for created_by
CREATE TRIGGER set_events_created_by
  BEFORE INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_expenses_created_by
  BEFORE INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_groups_created_by
  BEFORE INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();
