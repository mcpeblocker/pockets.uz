'use server';

import { apiFetch } from '@/lib/backend-api';
import { revalidatePath } from 'next/cache';

// V2: Enhanced join event with duplicate prevention
// V3: Support for authenticated users
export async function joinEvent(formData: FormData) {
  const eventId = formData.get('eventId') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const userId = formData.get('userId') as string | null;

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

  const { data: participant, error } = await apiFetch<{ id: string; participant_token?: string }>(
    '/api/participants/join',
    {
      method: 'POST',
      body: JSON.stringify({ eventId, name, email, userId }),
      auth: !!userId,
    }
  );

  if (error) {
    return { error };
  }

  if (!participant) {
    return { error: 'Failed to join event. Please try again.' };
  }

  // Get event slug for revalidation
  const { data: event } = await apiFetch<any>(`/api/events/${eventId}`);
  if (event?.slug) {
    revalidatePath(`/event/${event.slug}`);
  }

  return { 
    success: true, 
    participantId: participant.id, 
    participantToken: participant.participant_token 
  };
}

export async function getEventBySlug(slug: string) {
  const { data: event, error } = await apiFetch<any>(`/api/events/slug/${slug}`);

  if (error || !event) {
    return null;
  }

  return event;
}

export async function getEventParticipants(eventId: string) {
  const { data: participants, error } = await apiFetch<any[]>(`/api/participants/event/${eventId}`);

  if (error) {
    console.error('Error fetching participants:', error);
    return [];
  }

  return participants || [];
}

// V2: Enhanced expense fetching with splits and categories
export async function getEventExpenses(eventId: string) {
  const { data: expenses, error } = await apiFetch<any[]>(`/api/expenses/event/${eventId}`);

  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }

  return expenses || [];
}

export async function getEventSettlements(eventId: string) {
  const { data: settlements, error } = await apiFetch<any[]>(`/api/settlements/event/${eventId}`);

  if (error) {
    console.error('Error fetching settlements:', error);
    return [];
  }

  return settlements || [];
}
