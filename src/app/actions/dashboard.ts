'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { calculateSettlements } from '@/lib/settlements';
import { sendSettlementEmail } from '@/lib/email';

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be signed in to create events' };
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const slug = formData.get('slug') as string;

  if (!title || !slug) {
    return { error: 'Title and slug are required' };
  }

  // Check if slug is already taken
  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    return { error: 'This slug is already taken. Please choose another.' };
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title,
      description: description || null,
      slug,
      owner_id: user.id,
      status: 'open',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating event:', error);
    return { error: 'Failed to create event' };
  }

  revalidatePath('/dashboard');
  return { success: true, event };
}

export async function getUserEvents() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  return events || [];
}

export async function addExpense(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be signed in' };
  }

  const eventId = formData.get('eventId') as string;
  const description = formData.get('description') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const paidByParticipantId = formData.get('paidByParticipantId') as string;

  if (!eventId || !description || !amount || !paidByParticipantId) {
    return { error: 'All fields are required' };
  }

  if (amount <= 0) {
    return { error: 'Amount must be greater than 0' };
  }

  // Verify ownership
  const { data: event } = await supabase
    .from('events')
    .select('owner_id')
    .eq('id', eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('expenses')
    .insert({
      event_id: eventId,
      description,
      amount,
      paid_by_participant_id: paidByParticipantId,
    });

  if (error) {
    console.error('Error adding expense:', error);
    return { error: 'Failed to add expense' };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteExpense(expenseId: string, eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Verify ownership
  const { data: event } = await supabase
    .from('events')
    .select('owner_id')
    .eq('id', eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) {
    console.error('Error deleting expense:', error);
    return { error: 'Failed to delete expense' };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function updatePaymentStatus(participantId: string, eventId: string, status: 'pending' | 'paid') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Verify ownership
  const { data: event } = await supabase
    .from('events')
    .select('owner_id')
    .eq('id', eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('participants')
    .update({ payment_status: status })
    .eq('id', participantId);

  if (error) {
    console.error('Error updating payment status:', error);
    return { error: 'Failed to update payment status' };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateEmailNote(eventId: string, emailNote: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Verify ownership
  const { data: event } = await supabase
    .from('events')
    .select('owner_id')
    .eq('id', eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('events')
    .update({ email_note: emailNote })
    .eq('id', eventId);

  if (error) {
    console.error('Error updating email note:', error);
    return { error: 'Failed to update email note' };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function closeEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Verify ownership and get event details
  const { data: event } = await supabase
    .from('events')
    .select('*, participants(*), expenses(*)')
    .eq('id', eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: 'Unauthorized' };
  }

  if (event.status === 'closed') {
    return { error: 'Event is already closed' };
  }

  // Calculate settlements
  const settlements = calculateSettlements(event.participants, event.expenses);

  // Save settlements to database
  if (settlements.length > 0) {
    const { error: settlementsError } = await supabase
      .from('settlements')
      .insert(
        settlements.map(s => ({
          event_id: eventId,
          from_participant_id: s.fromParticipantId,
          to_participant_id: s.toParticipantId,
          from_name: s.fromName,
          to_name: s.toName,
          amount: s.amount,
        }))
      );

    if (settlementsError) {
      console.error('Error saving settlements:', settlementsError);
      return { error: 'Failed to save settlements' };
    }
  }

  // Close the event
  const { error: closeError } = await supabase
    .from('events')
    .update({ status: 'closed' })
    .eq('id', eventId);

  if (closeError) {
    console.error('Error closing event:', closeError);
    return { error: 'Failed to close event' };
  }

  // Send emails to participants
  const participantsWithEmail = event.participants.filter((p: any) => p.email);
  for (const participant of participantsWithEmail) {
    await sendSettlementEmail(
      participant.email,
      event.title,
      settlements.map(s => ({
        from: s.fromName,
        to: s.toName,
        amount: s.amount,
      })),
      event.email_note
    );
  }

  revalidatePath('/dashboard');
  revalidatePath(`/event/${event.slug}`);
  return { success: true };
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Verify ownership
  const { data: event } = await supabase
    .from('events')
    .select('owner_id')
    .eq('id', eventId)
    .single();

  if (!event || event.owner_id !== user.id) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    console.error('Error deleting event:', error);
    return { error: 'Failed to delete event' };
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
