import Header from '@/components/Header';
import SupportForm from '@/components/SupportForm';
import HelpButton from '@/components/HelpButton';
import Link from 'next/link';
import { getUser } from '@/app/actions/auth';

export default async function Home() {
  const user = await getUser();

  return (
    <>
      <Header />
      <HelpButton />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <div className="flex items-center justify-center p-8 py-16">
          <div className="max-w-2xl text-center">
            <h1 className="text-5xl font-bold mb-4">Welcome to Pockets</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Make it extremely easy for willing people to share expenses transparently and settle them.
            </p>
            <div className="flex gap-4 justify-center">
              {user ? (
                <Link
                  href="/dashboard?create=true"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg"
                >
                  Create Event
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg"
                >
                  Create Event
                </Link>
              )}
              <Link
                href="/faq"
                className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 font-medium py-3 px-8 rounded-lg"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Why Pockets?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-bold mb-2">No Registration Required</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Participants can join events and view expenses without creating an account.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="text-4xl mb-4">🧮</div>
              <h3 className="text-xl font-bold mb-2">Smart Calculations</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Automatically calculates fair splits and minimizes the number of transactions needed.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="text-xl font-bold mb-2">Email Notifications</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Automatic settlement emails when events close, so everyone knows what to pay.
              </p>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-16">
          <SupportForm />
        </div>
      </div>
    </>
  );
}
