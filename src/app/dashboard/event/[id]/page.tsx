import { redirect, notFound } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { apiFetch } from '@/lib/backend-api';
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

  // Get event and verify ownership
  const { data: event, error } = await apiFetch<any>(`/api/events/${id}`, { auth: true });

  if (error || !event) {
    notFound();
  }

  // Check if user is owner or participant
  const participants = await getEventParticipants(id);
  const participant = participants.find(p => p.user_id === user.id);

  if (event.owner_id !== user.id && !participant) {
    redirect('/dashboard');
  }

  const [expenses, settlements] = await Promise.all([
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
