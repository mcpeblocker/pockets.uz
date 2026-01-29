'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';

interface HomeClientProps {
  user: { id: string; email: string; name?: string | null } | null;
}

export default function HomeClient({ user }: HomeClientProps) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              {t.home.hero.title}
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              {t.home.hero.subtitle}
              <br className="hidden sm:block" />
              <span className="text-gray-500 dark:text-gray-400">{t.home.hero.subtitle2 || 'Free forever. No registration required for participants.'}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8">
              {user ? (
                <Link
                  href="/dashboard?create=true"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 min-h-[48px] sm:min-h-[56px] flex items-center justify-center"
                >
                  {t.dashboard.createFirstEvent}
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 min-h-[48px] sm:min-h-[56px] flex items-center justify-center"
                >
                  {t.home.hero.getStarted}
                </Link>
              )}
              <Link
                href="#how-it-works"
                className="w-full sm:w-auto bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg text-base sm:text-lg border-2 border-gray-300 dark:border-gray-600 transition-all duration-200 min-h-[48px] sm:min-h-[56px] flex items-center justify-center"
              >
                {t.home.hero.seeHowItWorks}
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400 font-semibold">✓</span>
                <span>{t.home.hero.freeForever}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400 font-semibold">✓</span>
                <span>{t.home.hero.noCreditCard}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400 font-semibold">✓</span>
                <span>{t.home.hero.noRegistration}</span>
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
              {t.home.howItWorks.title}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t.home.howItWorks.subtitle}
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
                {t.home.howItWorks.step1.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t.home.howItWorks.step1.description}
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-2xl font-bold mb-6">
                2
              </div>
              <div className="text-5xl mb-4">💰</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {t.home.howItWorks.step2.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t.home.howItWorks.step2.description}
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-2xl font-bold mb-6">
                3
              </div>
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {t.home.howItWorks.step3.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t.home.howItWorks.step3.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section - Simplified for now */}
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t.home.hero.noRegistration}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Participants join instantly with just a link. No sign-up needed.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="text-4xl mb-4">🧮</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Smart Calculations
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Automatically splits expenses and minimizes transactions needed.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Multi-Currency
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Works with USD, EUR, KRW, and 20+ currencies worldwide.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="text-4xl mb-4">📱</div>
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
                {t.dashboard.createFirstEvent}
              </Link>
            ) : (
              <Link
                href="/signup"
                className="bg-white hover:bg-gray-100 text-blue-600 font-semibold py-4 px-8 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
              >
                {t.home.hero.getStarted}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
