'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Event } from '@/lib/types';
import { createEvent } from '@/app/actions/dashboard';
import { CURRENCIES } from '@/lib/currency';
import Header from '@/components/Header';
import Link from 'next/link';

interface DashboardClientProps {
  user: User;
  events: Event[];
}

export default function DashboardClient({ user, events }: DashboardClientProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createStatus, setCreateStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [createMessage, setCreateMessage] = useState('');

  async function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateStatus('loading');

    const formData = new FormData(e.currentTarget);
    const result = await createEvent(formData);

    if (result.error) {
      setCreateStatus('error');
      setCreateMessage(result.error);
    } else {
      setCreateStatus('success');
      setCreateMessage('Event created successfully!');
      setShowCreateForm(false);
      // Refresh page to show new event
      window.location.reload();
    }
  }

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back, {user.email}
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Create Event
            </button>
          </div>

          {/* Create Event Form */}
          {showCreateForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">Create New Event</h2>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium mb-2">
                    Event Title *
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    required
                    placeholder="Team Dinner"
                    onChange={(e) => {
                      const slugInput = document.getElementById('slug') as HTMLInputElement;
                      if (slugInput && !slugInput.value) {
                        slugInput.value = generateSlug(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label htmlFor="slug" className="block text-sm font-medium mb-2">
                    URL Slug *
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">/event/</span>
                    <input
                      id="slug"
                      name="slug"
                      type="text"
                      required
                      pattern="[a-z0-9-]+"
                      placeholder="team-dinner"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Only lowercase letters, numbers, and hyphens
                  </p>
                </div>

                <div>
                  <label htmlFor="currency" className="block text-sm font-medium mb-2">
                    Currency *
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    defaultValue="USD"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name} ({currency.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    placeholder="A brief description of the event..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>

                {createStatus === 'error' && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
                    {createMessage}
                  </div>
                )}

                {createStatus === 'success' && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-800 dark:text-green-200">
                    {createMessage}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={createStatus === 'loading'}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {createStatus === 'loading' ? 'Creating...' : 'Create Event'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateStatus('idle');
                      setCreateMessage('');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Events List */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Your Events</h2>
            {events.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  You haven&apos;t created any events yet.
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Create Your First Event
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/dashboard/event/${event.id}`}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold">{event.title}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.status === 'open'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {event.status === 'open' ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="text-sm text-gray-500">
                      /event/{event.slug}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
