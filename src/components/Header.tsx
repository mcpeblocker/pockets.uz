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
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
        <Link href="/" className="text-xl sm:text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
          Pockets
        </Link>
        
        <nav className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <>
              <Link href="/dashboard" className="text-sm sm:text-base hover:text-blue-600 transition-colors">
                Dashboard
              </Link>
              <span className="hidden sm:inline text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
                {user.email}
              </span>
              <form action={signOut}>
                <button 
                  type="submit" 
                  className="text-xs sm:text-sm text-red-600 hover:text-red-700 transition-colors"
                  aria-label="Sign out"
                >
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <Link 
              href="/login" 
              className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
