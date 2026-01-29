"use client";

import { useState, useEffect } from "react";
import { createEvent } from "@/app/actions/dashboard";
import Header from "@/components/Header";
import Link from "next/link";
import { CURRENCIES } from "@/lib/currency";
import { useI18n } from "@/lib/i18n/context";

type DashboardUser = {
  id: string;
  email: string;
  name?: string | null;
};

type DashboardEvent = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  status: "open" | "closed";
  owner_id: string;
};

interface DashboardClientProps {
  user: DashboardUser;
  events: DashboardEvent[];
  initialShowCreate?: boolean;
}

export default function DashboardClient({
  user,
  events,
  initialShowCreate = false,
}: DashboardClientProps) {
  const { t } = useI18n();
  const [showCreateForm, setShowCreateForm] = useState(initialShowCreate);
  const [createStatus, setCreateStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [createMessage, setCreateMessage] = useState('');

  // Remove query param from URL when component mounts with create=true
  useEffect(() => {
    if (initialShowCreate) {
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [initialShowCreate]);

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
      // Redirect to event page with QR code shown
      if (result.event?.id) {
        window.location.href = `/dashboard/event/${result.event.id}?showQR=true`;
      } else {
        // Fallback: refresh page
        window.location.reload();
      }
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{t.dashboard.title}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {t.dashboard.welcome}, <span className="font-semibold">{user.name || user.email}</span>
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 min-h-[48px] flex items-center justify-center"
            >
              {t.nav.createEvent}
            </button>
          </div>

          {/* Create Event Form */}
          {showCreateForm && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 mb-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{t.event.create}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{t.home.howItWorks.step1.description}</p>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium mb-2">
                    {t.event.title} *
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
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 transition-all duration-200"
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
                    {t.event.currency} *
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    defaultValue="USD"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 transition-all duration-200"
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
                    {t.event.description} (optional)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    placeholder="A brief description of the event..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 transition-all duration-200"
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
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:transform-none"
                  >
                    {createStatus === 'loading' ? t.common.loading : t.nav.createEvent}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateStatus('idle');
                      setCreateMessage('');
                    }}
                    className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Events List */}
          <div>
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{t.dashboard.title}</h2>
            {events.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center border border-gray-200 dark:border-gray-700">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                  {t.dashboard.noEvents}
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  {t.dashboard.createFirstEvent}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => {
                  const isOwner = event.owner_id === user.id;
                  return (
                    <Link
                      key={event.id}
                      href={`/dashboard/event/${event.id}`}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-1 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold">{event.title}</h3>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              event.status === 'open'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}
                          >
                            {event.status === 'open' ? 'Open' : 'Closed'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              isOwner
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            }`}
                          >
                            {isOwner ? t.dashboard.eventOwner : t.dashboard.eventParticipant}
                          </span>
                        </div>
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
