// Database types
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
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  event_id: string;
  description: string;
  amount: number;
  currency: string;
  paid_by_participant_id: string;
  created_at: string;
  updated_at: string;
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
