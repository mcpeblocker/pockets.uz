'use client';

import { useState } from 'react';
import { Event, Participant, Expense, Settlement } from '@/lib/types';
import {
  addExpense,
  deleteExpense,
  updatePaymentStatus,
  updateEmailNote,
  closeEvent,
  deleteEvent,
} from '@/app/actions/dashboard';
import { formatCurrency } from '@/lib/currency';
import Header from '@/components/Header';
import Link from 'next/link';

interface EventManagementClientProps {
  event: Event;
  participants: Participant[];
  expenses: Array<Expense & { paid_by?: { id: string; name: string } }>;
  settlements: Settlement[];
}

export default function EventManagementClient({
  event,
  participants,
  expenses,
  settlements,
}: EventManagementClientProps) {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEmailNote, setShowEmailNote] = useState(false);
  const [emailNote, setEmailNote] = useState(event.email_note || '');
  const [expenseStatus, setExpenseStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [expenseMessage, setExpenseMessage] = useState('');

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const sharePerPerson = participants.length > 0 ? totalExpenses / participants.length : 0;

  async function handleAddExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setExpenseStatus('loading');

    const formData = new FormData(e.currentTarget);
    const result = await addExpense(formData);

    if (result.error) {
      setExpenseStatus('error');
      setExpenseMessage(result.error);
    } else {
      setExpenseStatus('success');
      setExpenseMessage('Expense added successfully!');
      setShowAddExpense(false);
      window.location.reload();
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    const result = await deleteExpense(expenseId, event.id);
    if (result.error) {
      alert(result.error);
    } else {
      window.location.reload();
    }
  }

  async function handleUpdatePaymentStatus(participantId: string, status: 'pending' | 'paid') {
    const result = await updatePaymentStatus(participantId, event.id, status);
    if (result.error) {
      alert(result.error);
    } else {
      window.location.reload();
    }
  }

  async function handleSaveEmailNote() {
    const result = await updateEmailNote(event.id, emailNote);
    if (result.error) {
      alert(result.error);
    } else {
      alert('Email note saved!');
      setShowEmailNote(false);
      window.location.reload();
    }
  }

  async function handleCloseEvent() {
    if (!confirm('Are you sure you want to close this event? Settlement emails will be sent to participants.')) {
      return;
    }

    const result = await closeEvent(event.id);
    if (result.error) {
      alert(result.error);
    } else {
      alert('Event closed successfully! Settlement emails have been sent.');
      window.location.reload();
    }
  }

  async function handleDeleteEvent() {
    if (!confirm('Are you sure you want to DELETE this event? This cannot be undone.')) {
      return;
    }

    const result = await deleteEvent(event.id);
    if (result.error) {
      alert(result.error);
    }
    // If successful, the action will redirect to dashboard
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Link
            href="/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Dashboard
          </Link>

          {/* Event Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
                {event.description && (
                  <p className="text-gray-600 dark:text-gray-400">{event.description}</p>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Public URL:{' '}
                  <Link
                    href={`/event/${event.slug}`}
                    className="text-blue-600 hover:underline"
                    target="_blank"
                  >
                    /event/{event.slug}
                  </Link>
                </p>
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
                <p className="text-2xl font-bold">${formatCurrency(totalExpenses, event.currency)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Participants</p>
                <p className="text-2xl font-bold">{participants.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Per Person</p>
                <p className="text-2xl font-bold">${formatCurrency(sharePerPerson, event.currency)}</p>
              </div>
            </div>

            {/* Action Buttons */}
            {event.status === 'open' && (
              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowEmailNote(true)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg"
                >
                  Edit Email Note
                </button>
                <button
                  onClick={handleCloseEvent}
                  disabled={participants.length === 0 || expenses.length === 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg"
                >
                  Close Event & Send Settlements
                </button>
                <button
                  onClick={handleDeleteEvent}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
                >
                  Delete Event
                </button>
              </div>
            )}
          </div>

          {/* Email Note Modal */}
          {showEmailNote && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-lg w-full">
                <h2 className="text-xl font-bold mb-4">Edit Email Note</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  This note will be included in the settlement email sent to participants.
                </p>
                <textarea
                  value={emailNote}
                  onChange={(e) => setEmailNote(e.target.value)}
                  rows={4}
                  placeholder="e.g., Please settle via Venmo @username"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveEmailNote}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowEmailNote(false);
                      setEmailNote(event.email_note || '');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Expense Button */}
          {event.status === 'open' && participants.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setShowAddExpense(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg"
              >
                Add Expense
              </button>
            </div>
          )}

          {/* Add Expense Form */}
          {showAddExpense && event.status === 'open' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Add Expense</h2>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <input type="hidden" name="eventId" value={event.id} />

                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-2">
                    Description *
                  </label>
                  <input
                    id="description"
                    name="description"
                    type="text"
                    required
                    placeholder="Dinner at restaurant"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label htmlFor="amount" className="block text-sm font-medium mb-2">
                    Amount ($) *
                  </label>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="100.00"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label htmlFor="paidByParticipantId" className="block text-sm font-medium mb-2">
                    Paid By *
                  </label>
                  <select
                    id="paidByParticipantId"
                    name="paidByParticipantId"
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  >
                    <option value="">Select participant</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {expenseStatus === 'error' && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
                    {expenseMessage}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={expenseStatus === 'loading'}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg"
                  >
                    {expenseStatus === 'loading' ? 'Adding...' : 'Add Expense'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddExpense(false);
                      setExpenseStatus('idle');
                      setExpenseMessage('');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Warning if no participants */}
          {participants.length === 0 && event.status === 'open' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 dark:text-yellow-200">
                ⚠️ No participants yet. Share the event link with people to join!
              </p>
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
                    <div className="flex-1">
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Paid by {expense.paid_by?.name || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-bold">${formatCurrency(expense.amount, event.currency)}</p>
                      {event.status === 'open' && (
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
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
                      {participant.telegram_username && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {participant.telegram_username}
                        </p>
                      )}
                    </div>
                    {event.status === 'closed' && (
                      <button
                        onClick={() =>
                          handleUpdatePaymentStatus(
                            participant.id,
                            participant.payment_status === 'paid' ? 'pending' : 'paid'
                          )
                        }
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          participant.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}
                      >
                        {participant.payment_status === 'paid' ? 'Paid ✓' : 'Mark as Paid'}
                      </button>
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
                      ${formatCurrency(settlement.amount, event.currency)}
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
