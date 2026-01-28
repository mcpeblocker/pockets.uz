import { notFound } from 'next/navigation';
import {
  getEventBySlug,
  getEventParticipants,
  getEventExpenses,
  getEventSettlements,
} from '@/app/actions/events';
import { getUser } from '@/app/actions/auth';
import EventPageClient from './EventPageClient';

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const user = await getUser();

  const [participants, expenses, settlements] = await Promise.all([
    getEventParticipants(event.id),
    getEventExpenses(event.id),
    getEventSettlements(event.id),
  ]);

  // Check if authenticated user is already a participant
  const userParticipant = user 
    ? participants.find(p => p.user_id === user.id || p.email?.toLowerCase() === user.email?.toLowerCase())
    : null;

  return (
    <EventPageClient
      event={event}
      participants={participants}
      expenses={expenses}
      settlements={settlements}
      currentUser={user ? { id: user.id, email: user.email || '', name: user.name || user.email?.split('@')[0] || '' } : null}
      userParticipantId={userParticipant?.id || null}
    />
  );
}
