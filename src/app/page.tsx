import Header from '@/components/Header';
import HelpButton from '@/components/HelpButton';
import { getUser } from '@/app/actions/auth';
import HomeClient from './page-client';

export default async function Home() {
  const user = await getUser();

  return (
    <>
      <Header />
      <HelpButton />
      <HomeClient user={user} />
    </>
  );
}
