import Header from '@/components/Header';
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
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Split Expenses.{' '}
                <span className="text-blue-600 dark:text-blue-400">Settle Debts.</span>{' '}
                No Hassle.
              </h1>
              <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                The easiest way to track shared expenses with friends, roommates, and groups.
                <br className="hidden sm:block" />
                <span className="text-gray-500 dark:text-gray-400">Free forever. No registration required for participants.</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8">
                {user ? (
                  <Link
                    href="/dashboard?create=true"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 min-h-[48px] sm:min-h-[56px] flex items-center justify-center"
                  >
                    Create Your First Event
                  </Link>
                ) : (
                  <Link
                    href="/signup"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 min-h-[48px] sm:min-h-[56px] flex items-center justify-center"
                  >
                    Get Started Free
                  </Link>
                )}
                <Link
                  href="#how-it-works"
                  className="w-full sm:w-auto bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg text-base sm:text-lg border-2 border-gray-300 dark:border-gray-600 transition-all duration-200 min-h-[48px] sm:min-h-[56px] flex items-center justify-center"
                >
                  See How It Works
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400 font-semibold">✓</span>
                  <span>Free Forever</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400 font-semibold">✓</span>
                  <span>No Credit Card</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400 font-semibold">✓</span>
                  <span>No Registration Needed</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-16 sm:py-24 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                How It Works
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Three simple steps to start tracking and settling expenses
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {/* Step 1 */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-2xl font-bold mb-6">
                  1
                </div>
                <div className="text-5xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Create an Event
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Start a new expense event, add a title and description. Get a shareable link or QR code instantly.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-2xl font-bold mb-6">
                  2
                </div>
                <div className="text-5xl mb-4">💰</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Add Expenses
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Participants join via the link and add expenses. Split equally, custom amounts, or keep personal expenses separate.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-2xl font-bold mb-6">
                  3
                </div>
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Settle Up
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Close the event to calculate who owes whom. Automatic settlement emails sent to all participants.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features Section */}
        <section className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Everything You Need
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Powerful features to make expense sharing effortless
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {/* Feature 1 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  No Registration Required
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Participants join instantly with just a link. No sign-up needed.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
                <div className="text-4xl mb-4">🧮</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Smart Calculations
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Automatically splits expenses and minimizes transactions needed.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
                <div className="text-4xl mb-4">🌍</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Multi-Currency
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Works with USD, EUR, KRW, and 20+ currencies worldwide.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
                <div className="text-4xl mb-4">📷</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Receipt Photos
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Attach receipt photos to expenses for proof and records.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
                <div className="text-4xl mb-4">📧</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Email Notifications
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Automatic settlement emails when events close.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Real-Time Updates
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  See expenses and balances update instantly.
                </p>
              </div>

              {/* Feature 7 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
                <div className="text-4xl mb-4">📱</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  QR Code Sharing
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Share events instantly with QR codes. Scan and join.
                </p>
              </div>

              {/* Feature 8 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
                <div className="text-4xl mb-4">📲</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Mobile-Friendly
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Works perfectly on phones, tablets, and desktops.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-16 sm:py-24 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Perfect For
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Whether it's a weekend trip or monthly bills, Pockets makes it easy
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="text-4xl mb-4">✈️</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Travel & Trips
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Split hotel costs, meals, and activities on group trips. Track everything in one place.
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                <div className="text-4xl mb-4">🏠</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Shared Rent & Utilities
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Split monthly rent, electricity, internet, and other shared bills with roommates.
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                <div className="text-4xl mb-4">🍽️</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Group Dinners & Events
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Split restaurant bills, event tickets, and party costs with friends.
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Roommate Expenses
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Track groceries, household items, and shared purchases with housemates.
                </p>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-xl p-6 border border-pink-200 dark:border-pink-800">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Team Outings
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Organize team lunches, happy hours, and company events. Split costs fairly.
                </p>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
                <div className="text-4xl mb-4">🎁</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Gifts & Celebrations
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Split gift costs, party expenses, and celebration bills with groups.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-16 sm:py-24 bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 sm:p-12">
              <div className="inline-block bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                Free Forever
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                No Hidden Costs. No Surprises.
              </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                Pockets is completely free to use. No credit card required. No subscription fees. No limits.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left mb-8">
                <div className="flex items-start gap-3">
                  <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Unlimited Events</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Create as many as you need</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Unlimited Participants</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Invite anyone you want</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">All Features Included</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">No premium tiers</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Preview Section */}
        <section className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Quick answers to common questions
              </p>
            </div>
            <div className="space-y-4">
              <details className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex items-center justify-between">
                  <span>Do participants need to create an account?</span>
                  <span className="text-gray-400">+</span>
                </summary>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  No! Participants can join events using just the link or QR code. Only event creators need to sign up.
                </p>
              </details>
              <details className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex items-center justify-between">
                  <span>Is Pockets really free?</span>
                  <span className="text-gray-400">+</span>
                </summary>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  Yes, completely free forever. No credit card required, no subscription fees, no hidden costs.
                </p>
              </details>
              <details className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex items-center justify-between">
                  <span>How does expense splitting work?</span>
                  <span className="text-gray-400">+</span>
                </summary>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  You can split expenses equally among selected participants, use custom amounts, or mark expenses as personal (no split).
                </p>
              </details>
              <details className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex items-center justify-between">
                  <span>What happens when I close an event?</span>
                  <span className="text-gray-400">+</span>
                </summary>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  When you close an event, Pockets calculates who owes whom and sends personalized settlement emails to all participants with payment instructions.
                </p>
              </details>
            </div>
            <div className="text-center mt-8">
              <Link
                href="/faq"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold"
              >
                View All FAQs →
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 sm:py-24 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of users who are already splitting expenses the easy way.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link
                  href="/dashboard?create=true"
                  className="bg-white hover:bg-gray-100 text-blue-600 font-semibold py-4 px-8 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  Create Your First Event
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="bg-white hover:bg-gray-100 text-blue-600 font-semibold py-4 px-8 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  Get Started Free
                </Link>
              )}
              <Link
                href="/faq"
                className="bg-blue-700/50 hover:bg-blue-700/70 text-white font-semibold py-4 px-8 rounded-lg text-lg border-2 border-white/30 transition-all duration-200"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>

        {/* Enhanced Footer */}
        <footer className="bg-gray-900 dark:bg-black text-gray-300 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="text-white font-bold text-xl mb-4">Pockets</h3>
                <p className="text-gray-400 text-sm">
                  The easiest way to share expenses and settle debts with friends and groups.
              </p>
            </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                      Dashboard
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Support</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#support" className="text-gray-400 hover:text-white transition-colors">
                      Contact Us
                    </a>
                  </li>
                  <li>
                    <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">
                      Help Center
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Account</h4>
                <ul className="space-y-2 text-sm">
                  {user ? (
                    <>
                      <li>
                        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                          Dashboard
                        </Link>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <Link href="/signup" className="text-gray-400 hover:text-white transition-colors">
                          Sign Up
                        </Link>
                      </li>
                      <li>
                        <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
                          Sign In
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
              <p>© {new Date().getFullYear()} Pockets. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
