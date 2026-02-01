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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Frequently Asked Questions</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Everything you need to know about using Pockets
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-shadow duration-200 border border-gray-200 dark:border-gray-700"
              >
                <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{faq.question}</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-8 text-center shadow-lg">
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Still have questions?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We&apos;re here to help! Send us a message and we&apos;ll get back to you.
            </p>
            <Link
              href="/#support"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
