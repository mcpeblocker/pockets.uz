import Header from '@/components/Header';
import Link from 'next/link';

export default function FAQPage() {
  const faqs = [
    {
      question: 'Do I need to create an account to participate?',
      answer: 'No! Registration is completely optional. You can join events and view expenses without creating an account. You only need to sign in if you want to create and manage your own events.',
    },
    {
      question: 'How do I create an event?',
      answer: 'Sign in using the magic link sent to your email, then go to your dashboard and click "Create Event". Give your event a title and a unique URL slug, and you\'re ready to start adding expenses!',
    },
    {
      question: 'How do I join an event?',
      answer: 'Simply visit the event page using the link shared by the organizer. Click "Join This Event" and provide your name and either your email or Telegram username.',
    },
    {
      question: 'How are expenses split?',
      answer: 'All expenses are split equally among all participants. The app automatically calculates how much each person should pay or receive.',
    },
    {
      question: 'What happens when an event is closed?',
      answer: 'When the organizer closes an event, the app calculates the optimal way to settle debts (minimizing the number of transactions). Settlement details are emailed to all participants who provided an email address.',
    },
    {
      question: 'How does the settlement calculation work?',
      answer: 'The app calculates how much each person spent versus their fair share, then uses a smart algorithm to minimize the number of payments needed to settle all debts.',
    },
    {
      question: 'Can I edit or delete expenses?',
      answer: 'Only the event organizer can add, edit, or delete expenses through the dashboard. This ensures everyone sees the same information.',
    },
    {
      question: 'What if someone hasn\'t paid yet?',
      answer: 'The organizer can manually mark payments as "paid" or "pending" in the dashboard. This helps everyone track who has settled their debts.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes! We use industry-standard security practices. Your data is stored securely and we never share your information with third parties.',
    },
    {
      question: 'Can I reopen a closed event?',
      answer: 'No, once an event is closed, it becomes read-only. If you need to make changes, you\'ll need to create a new event.',
    },
  ];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Everything you need to know about using Pockets
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
              >
                <h2 className="text-xl font-bold mb-3">{faq.question}</h2>
                <p className="text-gray-600 dark:text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Still have questions?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We&apos;re here to help! Send us a message and we&apos;ll get back to you.
            </p>
            <Link
              href="/#support"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
