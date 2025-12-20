'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function joinEvent(formData: FormData) {
  const eventId = formData.get('eventId') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const telegramUsername = formData.get('telegramUsername') as string;

  if (!eventId || !name) {
    return { error: 'Event ID and name are required' };
  }

  if (!email && !telegramUsername) {
    return { error: 'Please provide either email or Telegram username' };
  }

  const supabase = await createClient();

  // Check if event exists and is open
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .single();

  if (eventError || !event) {
    return { error: 'Event not found' };
  }

  if (event.status === 'closed') {
    return { error: 'This event is closed and no longer accepting participants' };
  }

  // Add participant
  const { data: participant, error } = await supabase
    .from('participants')
    .insert({
      event_id: eventId,
      name,
      email: email || null,
      telegram_username: telegramUsername || null,
      payment_status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error joining event:', error);
    return { error: 'Failed to join event. You may have already joined.' };
  }

  revalidatePath(`/event/[slug]`);
  return { success: true, participantId: participant?.id };
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

export async function getEventExpenses(eventId: string) {
  const supabase = await createClient();

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*, paid_by:participants!expenses_paid_by_participant_id_fkey(id, name)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
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

  return settlements || [];
}
