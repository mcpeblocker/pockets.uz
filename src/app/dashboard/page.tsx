import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getUserEvents } from '@/app/actions/dashboard';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const events = await getUserEvents();

  return <DashboardClient user={user} events={events} />;
}
