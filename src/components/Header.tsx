'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { signOut } from '@/app/actions/auth';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          Pockets
        </Link>
        
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/dashboard" className="text-sm hover:text-blue-600">
                Dashboard
              </Link>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user.email}
              </span>
              <form action={signOut}>
                <button type="submit" className="text-sm text-red-600 hover:text-red-700">
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <Link 
              href="/login" 
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
