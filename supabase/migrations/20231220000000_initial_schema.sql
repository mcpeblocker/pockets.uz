-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  telegram_id TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  email_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_owner_id ON events(owner_id);

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  telegram_username TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  paid_by_participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_event_id ON expenses(event_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by_participant_id);

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

CREATE INDEX IF NOT EXISTS idx_settlements_event_id ON settlements(event_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Users policies
-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Events policies
-- Anyone can read events (public access for event pages)
CREATE POLICY "Events are publicly readable" ON events
  FOR SELECT
  USING (true);

-- Authenticated users can create events
CREATE POLICY "Authenticated users can create events" ON events
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Event owners can update their events
CREATE POLICY "Event owners can update events" ON events
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Event owners can delete their events
CREATE POLICY "Event owners can delete events" ON events
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Participants policies
-- Anyone can read participants (for public event pages)
CREATE POLICY "Participants are publicly readable" ON participants
  FOR SELECT
  USING (true);

-- Anyone can insert participants (for joining events without auth)
CREATE POLICY "Anyone can join events" ON participants
  FOR INSERT
  WITH CHECK (true);

-- Event owners can update participants
CREATE POLICY "Event owners can update participants" ON participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = participants.event_id
      AND events.owner_id = auth.uid()
    )
  );

-- Event owners can delete participants
CREATE POLICY "Event owners can delete participants" ON participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = participants.event_id
      AND events.owner_id = auth.uid()
    )
  );

-- Expenses policies
-- Anyone can read expenses (for public event pages)
CREATE POLICY "Expenses are publicly readable" ON expenses
  FOR SELECT
  USING (true);

-- Event owners can create expenses
CREATE POLICY "Event owners can create expenses" ON expenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = expenses.event_id
      AND events.owner_id = auth.uid()
    )
  );

-- Event owners can update expenses
CREATE POLICY "Event owners can update expenses" ON expenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = expenses.event_id
      AND events.owner_id = auth.uid()
    )
  );

-- Event owners can delete expenses
CREATE POLICY "Event owners can delete expenses" ON expenses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = expenses.event_id
      AND events.owner_id = auth.uid()
    )
  );

-- Settlements policies
-- Anyone can read settlements (for public event pages)
CREATE POLICY "Settlements are publicly readable" ON settlements
  FOR SELECT
  USING (true);

-- Event owners can create settlements
CREATE POLICY "Event owners can create settlements" ON settlements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = settlements.event_id
      AND events.owner_id = auth.uid()
    )
  );

-- Event owners can update settlements
CREATE POLICY "Event owners can update settlements" ON settlements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = settlements.event_id
      AND events.owner_id = auth.uid()
    )
  );

-- Event owners can delete settlements
CREATE POLICY "Event owners can delete settlements" ON settlements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = settlements.event_id
      AND events.owner_id = auth.uid()
    )
  );
