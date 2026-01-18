import { redirect, notFound } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase-server';
import { getEventParticipants, getEventExpenses, getEventSettlements } from '@/app/actions/events';
import EventManagementClient from './EventManagementClient';

export default async function EventManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const supabase = await createClient();

  // Get event and verify ownership
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !event) {
    notFound();
  }

  if (event.owner_id !== user.id) {
    redirect('/dashboard');
  }

  const [participants, expenses, settlements] = await Promise.all([
    getEventParticipants(id),
    getEventExpenses(id),
    getEventSettlements(id),
  ]);

  return (
    <EventManagementClient
      event={event}
      participants={participants}
      expenses={expenses}
      settlements={settlements}
    />
  );
}
