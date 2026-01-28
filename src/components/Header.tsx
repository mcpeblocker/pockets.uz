'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/actions/auth';

export default function Header() {
  const [user, setUser] = useState<any | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setUser(j.user || null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
            Pockets
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-3 lg:gap-4">
            {user ? (
              <>
                <Link href="/dashboard" className="text-sm lg:text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Dashboard
                </Link>
                <span className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px] px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {user.name || user.email}
                </span>
                <form action={signOut}>
                  <button 
                    type="submit" 
                    className="text-xs lg:text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                    className="text-sm lg:text-base bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 min-h-[44px] flex items-center justify-center"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/signup" 
                    className="text-sm lg:text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 min-h-[44px] flex items-center justify-center"
                  >
                    Sign Up
                  </Link>
                </>
              )
            )}
          </nav>

          {/* Mobile Menu Button */}
          {!isAuthPage && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-2 border-t border-gray-200 dark:border-gray-700 pt-4">
            {user ? (
              <div className="flex flex-col gap-3">
                <Link 
                  href="/dashboard" 
                  className="text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px] flex items-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <div className="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {user.name || user.email}
                </div>
                <form action={signOut}>
                  <button 
                    type="submit" 
                    className="w-full text-left text-base font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors py-2 px-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[44px] flex items-center"
                  >
                    Sign Out
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link 
                  href="/login" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold shadow-md text-center min-h-[44px] flex items-center justify-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link 
                  href="/signup" 
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 rounded-lg font-semibold shadow-md text-center min-h-[44px] flex items-center justify-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
