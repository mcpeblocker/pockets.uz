import { redirect, notFound } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase-server';
import { getEventParticipants, getEventExpenses, getEventSettlements } from '@/app/actions/events';
import EventManagementClient from './EventManagementClient';

export default async function EventManagementPage({ 
  params,
  searchParams,
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ showQR?: string }>;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const paramsObj = await searchParams;
  const showQR = paramsObj?.showQR === 'true';
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

  // Check if user is owner or participant
  const { data: participant } = await supabase
    .from('participants')
    .select('id')
    .eq('event_id', id)
    .eq('user_id', user.id)
    .single();

  if (event.owner_id !== user.id && !participant) {
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
      initialShowQR={showQR}
      currentUserId={user.id}
    />
  );
}
