import { redirect } from 'next/navigation';
import { getUser } from '@/app/actions/auth';
import { getUserEvents } from '@/app/actions/dashboard';
import DashboardClient from './DashboardClient';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const events = await getUserEvents();
  const params = await searchParams;
  const showCreate = params?.create === 'true';

  return <DashboardClient user={user} events={events} initialShowCreate={showCreate} />;
}
