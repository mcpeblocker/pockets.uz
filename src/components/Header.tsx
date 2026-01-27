'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/actions/auth';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const supabase = createClient();
  const isAuthPage = pathname === '/login' || pathname === '/signup';

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
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
          Pockets
        </Link>
        
        <nav className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <>
              <Link href="/dashboard" className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Dashboard
              </Link>
              <span className="hidden sm:inline text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px] px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                {user.email}
              </span>
              <form action={signOut}>
                <button 
                  type="submit" 
                  className="text-xs sm:text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  aria-label="Sign out"
                >
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            !isAuthPage && (
              <>
                <Link 
                  href="/login" 
                  className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  Sign In
                </Link>
                <Link 
                  href="/signup" 
                  className="text-xs sm:text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  Sign Up
                </Link>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
