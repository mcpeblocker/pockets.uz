// Database types - V2 Enhanced

export interface User {
  id: string;
  email: string | null;
  telegram_id: string | null;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  status: 'open' | 'closed';
  email_note: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  event_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  payment_status: 'pending' | 'paid';
  participant_token: string | null; // V2: Better identification
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  event_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  event_id: string;
  description: string;
  amount: number;
  currency: string;
  paid_by_participant_id: string;
  expense_date: string | null; // V2: Date when expense occurred
  category_id: string | null; // V2: Expense category
  created_at: string;
  updated_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  participant_id: string;
  amount: number | null; // V2: Custom amount
  percentage: number | null; // V2: Custom percentage
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
