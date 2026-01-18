import { notFound } from 'next/navigation';
import {
  getEventBySlug,
  getEventParticipants,
  getEventExpenses,
  getEventSettlements,
} from '@/app/actions/events';
import EventPageClient from './EventPageClient';

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const [participants, expenses, settlements] = await Promise.all([
    getEventParticipants(event.id),
    getEventExpenses(event.id),
    getEventSettlements(event.id),
  ]);

  return (
    <EventPageClient
      event={event}
      participants={participants}
      expenses={expenses}
      settlements={settlements}
    />
  );
}
