'use client';

import { useState } from 'react';
import { signUpWithPassword } from '@/app/actions/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('name', name);

    try {
      console.log('🔄 Starting signup process...');
      const result = await signUpWithPassword(formData);
      
      console.log('📥 Signup result:', result);
      
      if (result.error) {
        console.error('❌ Signup error:', result.error);
        console.error('❌ Full result object:', JSON.stringify(result, null, 2));
        setStatus('error');
        // Show the full error message with all details
        setMessage(result.error);
      } else {
        console.log('✅ Signup successful!');
        setStatus('success');
        if (result.message) {
          setMessage(result.message);
        } else {
          setMessage('Account created! Redirecting...');
          setTimeout(() => router.push('/dashboard'), 1500);
        }
      }
    } catch (error) {
      console.error('❌ Unexpected error during signup:', error);
      setStatus('error');
      setMessage(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2 text-center">Create Account</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
          Create an account to manage your events and groups
        </p>

        {status === 'success' ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-800 dark:text-green-200">
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              />
            </div>

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

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Must be at least 8 characters
              </p>
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
              {status === 'loading' ? 'Processing...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p className="mt-2">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
