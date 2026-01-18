'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// V2: Enhanced join event with duplicate prevention
export async function joinEvent(formData: FormData) {
  const eventId = formData.get('eventId') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  if (!eventId || !name) {
    return { error: 'Event ID and name are required' };
  }

  if (!email) {
    return { error: 'Email is required for settlement notifications' };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: 'Invalid email format' };
  }

  const supabase = await createClient();

  // Check if event exists and is open
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, status, slug')
    .eq('id', eventId)
    .single();

  if (eventError || !event) {
    return { error: 'Event not found' };
  }

  if (event.status === 'closed') {
    return { error: 'This event is closed and no longer accepting participants' };
  }

  // V2: Check for duplicate email in same event
  const { data: existing } = await supabase
    .from('participants')
    .select('id, name')
    .eq('event_id', eventId)
    .ilike('email', email)
    .single();

  if (existing) {
    return { 
      error: `You have already joined this event as "${existing.name}". Please use a different email or contact the organizer.`,
      alreadyJoined: true,
      participantId: existing.id
    };
  }

  // Add participant
  const { data: participant, error } = await supabase
    .from('participants')
    .insert({
      event_id: eventId,
      name,
      email: email || null,
      payment_status: 'pending',
    })
    .select('id, participant_token')
    .single();

  if (error) {
    console.error('Error joining event:', error);
    if (error.code === '23505') {
      return { error: 'A participant with this email already exists in this event' };
    }
    return { error: 'Failed to join event. Please try again.' };
  }

  revalidatePath(`/event/[slug]`);
  revalidatePath(`/event/${event.slug}`);
  return { success: true, participantId: participant?.id, participantToken: participant?.participant_token };
}

export async function getEventBySlug(slug: string) {
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !event) {
    return null;
  }

  return event;
}

export async function getEventParticipants(eventId: string) {
  const supabase = await createClient();

  const { data: participants, error } = await supabase
    .from('participants')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching participants:', error);
    return [];
  }

  return participants || [];
}

// V2: Enhanced expense fetching with splits and categories
export async function getEventExpenses(eventId: string) {
  const supabase = await createClient();

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*, paid_by:participants!expenses_paid_by_participant_id_fkey(id, name), category:expense_categories(*)')
    .eq('event_id', eventId)
    .order('expense_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }

  // Fetch splits for all expenses
  if (expenses && expenses.length > 0) {
    const expenseIds = expenses.map(e => e.id);
    const { data: splits } = await supabase
      .from('expense_splits')
      .select('*, participant:participants(id, name)')
      .in('expense_id', expenseIds);

    // Attach splits to expenses
    expenses.forEach(expense => {
      expense.splits = splits?.filter(s => s.expense_id === expense.id) || [];
    });

    // Fetch receipts
    const { data: receipts } = await supabase
      .from('receipts')
      .select('*')
      .in('expense_id', expenseIds);

    // Attach receipts to expenses
    expenses.forEach(expense => {
      expense.receipts = receipts?.filter(r => r.expense_id === expense.id) || [];
    });
  }

  return expenses || [];
}

export async function getEventSettlements(eventId: string) {
  const supabase = await createClient();

  const { data: settlements, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching settlements:', error);
    return [];
  }

  // V2: Fetch settlement transactions
  if (settlements && settlements.length > 0) {
    const settlementIds = settlements.map(s => s.id);
    const { data: transactions } = await supabase
      .from('settlement_transactions')
      .select('*')
      .in('settlement_id', settlementIds);

    // Attach transactions to settlements
    settlements.forEach(settlement => {
      settlement.transaction = transactions?.find(t => t.settlement_id === settlement.id) || null;
    });
  }

  return settlements || [];
}

// V2: Get participant by token (for better identification)
export async function getParticipantByToken(participantToken: string, eventId: string) {
  const supabase = await createClient();

  const { data: participant, error } = await supabase
    .from('participants')
    .select('*')
    .eq('participant_token', participantToken)
    .eq('event_id', eventId)
    .single();

  if (error || !participant) {
    return null;
  }

  return participant;
}

// V2: Get participant by email (for checking if already joined)
export async function getParticipantByEmail(email: string, eventId: string) {
  const supabase = await createClient();

  const { data: participant, error } = await supabase
    .from('participants')
    .select('*')
    .ilike('email', email)
    .eq('event_id', eventId)
    .single();

  if (error || !participant) {
    return null;
  }

  return participant;
}
