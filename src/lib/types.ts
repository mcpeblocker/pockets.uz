// Database types - V3 Architecture with Groups, Permissions, and Audit

export interface User {
  id: string;
  email: string | null;
  telegram_id: string | null;
  name: string | null;
  created_at: string;
  updated_at: string;
}

// V3: Groups architecture
export interface Group {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  owner_id: string;
  settings: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  version: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  invited_by: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

// V3: Device sessions
export interface DeviceSession {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string | null;
  user_agent: string | null;
  ip_address: string | null;
  last_active_at: string;
  expires_at: string | null;
  created_at: string;
}

// V3: Auth providers (for OAuth)
export interface AuthProvider {
  id: string;
  user_id: string;
  provider: string; // 'google', 'github', 'email', etc.
  provider_user_id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  group_id: string | null; // V3: Can belong to a group
  status: 'open' | 'closed';
  email_note: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
  created_by: string | null; // V3: Audit field
  updated_by: string | null; // V3: Audit field
  version: number; // V3: For sync
}

export interface Participant {
  id: string;
  event_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  payment_status: 'pending' | 'paid';
  participant_token: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null; // V3: Audit field
  updated_by: string | null; // V3: Audit field
}

export interface ExpenseCategory {
  id: string;
  event_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  created_at: string;
  created_by: string | null; // V3: Audit field
}

export interface Expense {
  id: string;
  event_id: string;
  description: string;
  amount: number;
  currency: string;
  paid_by_participant_id: string;
  expense_date: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null; // V3: Audit field
  updated_by: string | null; // V3: Audit field
  version: number; // V3: For sync
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  participant_id: string;
  amount: number | null;
  percentage: number | null;
  created_at: string;
}

export interface Receipt {
  id: string;
  expense_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_at: string;
}

export interface Settlement {
  id: string;
  event_id: string;
  from_participant_id: string;
  to_participant_id: string;
  from_name: string;
  to_name: string;
  amount: number;
  created_at: string;
  updated_at: string;
  created_by: string | null; // V3: Audit field
  updated_by: string | null; // V3: Audit field
}

export interface SettlementTransaction {
  id: string;
  settlement_id: string;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventHistory {
  id: string;
  event_id: string;
  action: string;
  user_id: string | null;
  participant_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

// Extended types for UI
export interface ExpenseWithDetails extends Expense {
  paid_by?: { id: string; name: string };
  category?: ExpenseCategory | null;
  splits?: Array<ExpenseSplit & { participant: { id: string; name: string } }>;
  receipts?: Receipt[];
}

export interface SettlementWithTransaction extends Settlement {
  transaction?: SettlementTransaction | null;
}

export interface GroupWithMembers extends Group {
  members?: Array<GroupMember & { user?: User }>;
  member_count?: number;
}

export interface EventWithGroup extends Event {
  group?: Group | null;
}

// Form types
export interface ExpenseFormData {
  description: string;
  amount: number;
  paidByParticipantId: string;
  expenseDate?: string;
  categoryId?: string | null;
  splitType: 'equal' | 'custom';
  splits?: Array<{
    participantId: string;
    amount?: number;
    percentage?: number;
  }>;
}

export interface ParticipantFormData {
  name: string;
  email?: string | null;
}

// Permission types
export type UserRole = 'admin' | 'member' | 'owner' | 'public' | 'participant';

export interface PermissionCheck {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAddExpenses: boolean;
  canManageMembers: boolean;
  role: UserRole;
}
