-- V2 Schema Upgrade - Comprehensive improvements
-- This migration adds all the new features for v2

-- Add expense_date to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category_id UUID;

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT, -- Hex color for UI
  icon TEXT, -- Icon identifier
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, name)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_event_id ON expense_categories(event_id);

-- Create expense_splits table for custom splitting
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  percentage DECIMAL(5, 2) CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(expense_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_participant_id ON expense_splits(participant_id);

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

-- Add unique constraint to prevent duplicate participants (same email in same event)
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_event_email_unique 
ON participants(event_id, LOWER(email)) 
WHERE email IS NOT NULL;

-- Add participant_token for better identification
ALTER TABLE participants ADD COLUMN IF NOT EXISTS participant_token TEXT UNIQUE;
-- Generate tokens for existing participants
UPDATE participants SET participant_token = gen_random_uuid()::TEXT WHERE participant_token IS NULL;

-- Add settlement_transactions table for tracking individual settlement payments
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

-- Add event_history table for audit trail
CREATE TABLE IF NOT EXISTS event_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'expense_added', 'expense_updated', 'expense_deleted', 'participant_added', etc.
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  details JSONB, -- Flexible JSON for action-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_history_event_id ON event_history(event_id);
CREATE INDEX IF NOT EXISTS idx_event_history_created_at ON event_history(created_at);

-- Enable RLS on new tables
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_history ENABLE ROW LEVEL SECURITY;

-- Expense categories policies
CREATE POLICY "Expense categories are publicly readable" ON expense_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Event owners can manage expense categories" ON expense_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = expense_categories.event_id
      AND events.owner_id = auth.uid()
    )
  );

-- Expense splits policies
CREATE POLICY "Expense splits are publicly readable" ON expense_splits
  FOR SELECT
  USING (true);

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

-- Receipts policies
CREATE POLICY "Receipts are publicly readable" ON receipts
  FOR SELECT
  USING (true);

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

-- Settlement transactions policies
CREATE POLICY "Settlement transactions are publicly readable" ON settlement_transactions
  FOR SELECT
  USING (true);

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

-- Event history policies
CREATE POLICY "Event history is publicly readable" ON event_history
  FOR SELECT
  USING (true);

CREATE POLICY "System can create event history" ON event_history
  FOR INSERT
  WITH CHECK (true); -- History is created by system actions

-- Add function to automatically generate participant tokens
CREATE OR REPLACE FUNCTION generate_participant_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.participant_token IS NULL THEN
    NEW.participant_token := gen_random_uuid()::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_participant_token
  BEFORE INSERT ON participants
  FOR EACH ROW
  EXECUTE FUNCTION generate_participant_token();

-- Add function to log event history
CREATE OR REPLACE FUNCTION log_event_action(
  p_event_id UUID,
  p_action TEXT,
  p_user_id UUID DEFAULT NULL,
  p_participant_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
BEGIN
  INSERT INTO event_history (event_id, action, user_id, participant_id, details)
  VALUES (p_event_id, p_action, p_user_id, p_participant_id, p_details)
  RETURNING id INTO v_history_id;
  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;
