'use client';

import { useState, useEffect, Suspense } from 'react';
import { signInWithEmail } from '@/app/actions/auth';
import TelegramLoginWidget from '@/components/TelegramLoginWidget';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for Telegram auth status
    const telegramAuth = searchParams?.get('telegram_auth');
    const telegramError = searchParams?.get('error');
    const username = searchParams?.get('username');

    if (telegramAuth === 'success') {
      setStatus('success');
      setMessage(`Successfully authenticated with Telegram${username ? ` as @${username}` : ''}!`);
    } else if (telegramError) {
      setStatus('error');
      const errorMessages: Record<string, string> = {
        'invalid_telegram_data': 'Invalid Telegram authentication data',
        'telegram_not_configured': 'Telegram login is not configured',
        'invalid_telegram_auth': 'Telegram authentication failed - invalid signature',
        'telegram_auth_expired': 'Telegram authentication expired',
        'telegram_auth_failed': 'Telegram authentication failed',
      };
      setMessage(errorMessages[telegramError] || 'Telegram authentication failed');
    }
  }, [searchParams]);

  // Get bot name from environment or use placeholder
  const telegramBotName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || '';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    
    const formData = new FormData();
    formData.append('email', email);
    
    const result = await signInWithEmail(formData);
    
    if (result.error) {
      setStatus('error');
      setMessage(result.error);
    } else {
      setStatus('success');
      setMessage('Check your email for a magic link to sign in!');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2 text-center">Sign In</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
          Optional - only needed to create or manage events
        </p>

        {status === 'success' ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-800 dark:text-green-200">
            {message}
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                />
              </div>

              {status === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {status === 'loading' ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>

            {telegramBotName && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or sign in with</span>
                  </div>
                </div>

                <TelegramLoginWidget botName={telegramBotName} />
              </>
            )}
          </>
        )}

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>We&apos;ll send you a magic link to sign in.</p>
          <p className="mt-2">No password required!</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
