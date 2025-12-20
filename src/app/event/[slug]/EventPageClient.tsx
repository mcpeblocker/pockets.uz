'use client';

import { useState } from 'react';
import { Event, Participant, Expense, Settlement } from '@/lib/types';
import { joinEvent } from '@/app/actions/events';
import Header from '@/components/Header';
import HelpButton from '@/components/HelpButton';

interface EventPageClientProps {
  event: Event;
  participants: Participant[];
  expenses: Array<Expense & { paid_by: { id: string; name: string } }>;
  settlements: Settlement[];
}

export default function EventPageClient({
  event,
  participants,
  expenses,
  settlements,
}: EventPageClientProps) {
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinStatus, setJoinStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [joinMessage, setJoinMessage] = useState('');

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const sharePerPerson = participants.length > 0 ? totalExpenses / participants.length : 0;

  async function handleJoinSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setJoinStatus('loading');

    const formData = new FormData(e.currentTarget);
    const result = await joinEvent(formData);

    if (result.error) {
      setJoinStatus('error');
      setJoinMessage(result.error);
    } else {
      setJoinStatus('success');
      setJoinMessage('Successfully joined the event!');
      setShowJoinForm(false);
      // Refresh page to show new participant
      window.location.reload();
    }
  }

  return (
    <>
      <Header />
      <HelpButton />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Event Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
                {event.description && (
                  <p className="text-gray-600 dark:text-gray-400">{event.description}</p>
                )}
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  event.status === 'open'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}
              >
                {event.status === 'open' ? 'Open' : 'Closed'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
                <p className="text-2xl font-bold">${totalExpenses.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Participants</p>
                <p className="text-2xl font-bold">{participants.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Per Person</p>
                <p className="text-2xl font-bold">${sharePerPerson.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Join Button */}
          {event.status === 'open' && !showJoinForm && (
            <div className="mb-6">
              <button
                onClick={() => setShowJoinForm(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Join This Event
              </button>
            </div>
          )}

          {/* Join Form */}
          {showJoinForm && event.status === 'open' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Join Event</h2>
              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <input type="hidden" name="eventId" value={event.id} />
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Your Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="John Doe"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label htmlFor="telegramUsername" className="block text-sm font-medium mb-2">
                    Telegram Username
                  </label>
                  <input
                    id="telegramUsername"
                    name="telegramUsername"
                    type="text"
                    placeholder="@username"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  * Provide at least email or Telegram username
                </p>

                {joinStatus === 'error' && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
                    {joinMessage}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={joinStatus === 'loading'}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {joinStatus === 'loading' ? 'Joining...' : 'Join'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJoinForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Expenses */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Expenses</h2>
            {expenses.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No expenses yet.</p>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Paid by {expense.paid_by?.name || 'Unknown'}
                      </p>
                    </div>
                    <p className="text-lg font-bold">${expense.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Participants</h2>
            {participants.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No participants yet.</p>
            ) : (
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{participant.name}</p>
                      {participant.email && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {participant.email}
                        </p>
                      )}
                    </div>
                    {event.status === 'closed' && (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          participant.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}
                      >
                        {participant.payment_status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settlements (only shown when event is closed) */}
          {event.status === 'closed' && settlements.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">Settlement Summary</h2>
              {event.email_note && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium mb-1">Note from organizer:</p>
                  <p className="text-sm">{event.email_note}</p>
                </div>
              )}
              <div className="space-y-3">
                {settlements.map((settlement) => (
                  <div
                    key={settlement.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <p>
                      <span className="font-medium">{settlement.from_name}</span>
                      {' pays '}
                      <span className="font-medium">{settlement.to_name}</span>
                    </p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      ${settlement.amount.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
