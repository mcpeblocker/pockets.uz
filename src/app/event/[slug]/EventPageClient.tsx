'use client';

import { useEffect, useState } from 'react';
import { Event, Participant, Expense, Settlement } from '@/lib/types';
import { joinEvent } from '@/app/actions/events';
import { formatCurrency } from '@/lib/currency';
import Header from '@/components/Header';
import HelpButton from '@/components/HelpButton';
import { calculateBalances } from '@/lib/settlements';

interface EventPageClientProps {
  event: Event;
  participants: Participant[];
  expenses: Array<Expense & { paid_by: { id: string; name: string }; splits?: any[]; receipts?: any[] }>;
  settlements: Settlement[];
  currentUser: { id: string; email: string; name: string } | null;
  userParticipantId: string | null;
}

export default function EventPageClient({
  event,
  participants,
  expenses,
  settlements,
  currentUser,
  userParticipantId,
}: EventPageClientProps) {
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinStatus, setJoinStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [joinMessage, setJoinMessage] = useState('');
  const [myParticipantId, setMyParticipantId] = useState<string | null>(userParticipantId);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'photos'>('expenses');

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const sharePerPerson = participants.length > 0 ? totalExpenses / participants.length : 0;
  const shareIfJoin = participants.length > 0 ? totalExpenses / (participants.length + 1) : totalExpenses;

  // Calculate balances
  const allSplits = expenses.flatMap(e => e.splits || []);
  const balances = calculateBalances(participants, expenses, allSplits);
  const allBalanced = balances.every(b => Math.abs(b.balance) < 0.01);
  
  // Calculate current user's balance if they're a participant
  const currentUserParticipant = currentUser 
    ? participants.find(p => p.user_id === currentUser.id || p.email?.toLowerCase() === currentUser.email?.toLowerCase())
    : null;
  const myBalance = currentUserParticipant 
    ? balances.find(b => b.participantId === currentUserParticipant.id)
    : null;

  // Calculate payment statistics for closed events
  const paidCount = participants.filter(p => p.payment_status === 'paid').length;
  const pendingCount = participants.filter(p => p.payment_status === 'pending').length;
  const paidSettlements = settlements.filter(s => {
    const fromParticipant = participants.find(p => p.id === s.from_participant_id);
    return fromParticipant?.payment_status === 'paid';
  });
  const totalPaidAmount = paidSettlements.reduce((sum, s) => sum + s.amount, 0);
  const totalSettlementAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
  const pendingAmount = totalSettlementAmount - totalPaidAmount;

  // Check if user already joined from this device (for non-authenticated users)
  useEffect(() => {
    if (!userParticipantId) {
    const storedId = localStorage.getItem(`event_${event.id}_participant`);
    if (storedId) {
      setMyParticipantId(storedId);
    }
    }
  }, [event.id, userParticipantId]);

  // Quick join for authenticated users
  async function handleQuickJoin() {
    if (!currentUser) return;
    
    setJoinStatus('loading');
    
    const formData = new FormData();
    formData.append('eventId', event.id);
    formData.append('name', currentUser.name);
    formData.append('email', currentUser.email);
    formData.append('userId', currentUser.id);
    
    const result = await joinEvent(formData);

    if (result.error) {
      setJoinStatus('error');
      setJoinMessage(result.error);
    } else {
      setJoinStatus('success');
      setJoinMessage('Successfully joined the event!');
      if (result.participantId) {
        setMyParticipantId(result.participantId);
      }
      window.location.reload();
    }
  }

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
      // Store participant ID in localStorage
      if (result.participantId) {
        localStorage.setItem(`event_${event.id}_participant`, result.participantId);
        setMyParticipantId(result.participantId);
      }
      // Refresh page to show new participant
      window.location.reload();
    }
  }

  async function handleCancelJoin() {
    if (!myParticipantId || !confirm('Are you sure you want to leave this event?')) {
      return;
    }

    try {
      const response = await fetch('/api/leave-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: myParticipantId, eventId: event.id }),
      });

      if (response.ok) {
        localStorage.removeItem(`event_${event.id}_participant`);
        setMyParticipantId(null);
        window.location.reload();
      } else {
        alert('Failed to leave event. Please try again.');
      }
    } catch (error) {
      console.error('Error leaving event:', error);
      alert('Failed to leave event. Please try again.');
    }
  }

  return (
    <>
      <Header />
      <HelpButton />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Event Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 sm:p-8 mb-6 border border-gray-200 dark:border-gray-700">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
                <p className="text-2xl font-bold">{formatCurrency(totalExpenses, event.currency)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Participants</p>
                <p className="text-2xl font-bold">{participants.length}</p>
              </div>
            </div>
          </div>

          {/* Payment Statistics */}
          {participants.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 sm:p-8 mb-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold mb-4">Payment Tracking</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Paid</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {paidCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">participants</p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {pendingCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">participants</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {participants.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">participants</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(totalExpenses, event.currency)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">all expenses</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Statistics for Closed Events */}
          {event.status === 'closed' && settlements.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 sm:p-8 mb-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold mb-4">Settlement Status</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Amount Settled</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(totalPaidAmount, event.currency)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">paid so far</p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Amount Outstanding</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {formatCurrency(pendingAmount, event.currency)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">remaining</p>
                </div>
              </div>
            </div>
          )}

          {/* Preview if joining */}
          {event.status === 'open' && !showJoinForm && !myParticipantId && participants.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium mb-2">💡 If you join this event:</p>
              <p className="text-lg">
                You'll be able to view all expenses and see your individual balance in the Balances tab.
              </p>
            </div>
          )}

          {/* Cancel Join Button */}
          {event.status === 'open' && myParticipantId && (
            <div className="mb-6">
              <button
                onClick={handleCancelJoin}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Leave This Event
              </button>
            </div>
          )}

          {/* Join Button for Authenticated Users */}
          {event.status === 'open' && !myParticipantId && currentUser && (
            <div className="mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold mb-4">Join Event</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Join as <strong>{currentUser.name}</strong> ({currentUser.email})
                </p>
                
                {joinStatus === 'error' && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200 mb-4">
                    {joinMessage}
                  </div>
                )}
                
                <button
                  onClick={handleQuickJoin}
                  disabled={joinStatus === 'loading'}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  {joinStatus === 'loading' ? 'Joining...' : 'Join This Event'}
                </button>
              </div>
            </div>
          )}

          {/* Join Button for Non-Authenticated Users */}
          {event.status === 'open' && !showJoinForm && !myParticipantId && !currentUser && (
            <div className="mb-6">
              <button
                onClick={() => setShowJoinForm(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Join This Event
              </button>
            </div>
          )}

          {/* Join Form for Non-Authenticated Users */}
          {showJoinForm && event.status === 'open' && !currentUser && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 sm:p-8 mb-6 border border-gray-200 dark:border-gray-700">
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
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Email is required for settlement notifications
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

          {/* Tabs for Expenses, Balances, and Photos */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-6">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('expenses')}
                className={`flex-1 px-6 py-3 text-sm font-medium ${
                  activeTab === 'expenses'
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setActiveTab('balances')}
                className={`flex-1 px-6 py-3 text-sm font-medium ${
                  activeTab === 'balances'
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Balances
              </button>
              <button
                onClick={() => setActiveTab('photos')}
                className={`flex-1 px-6 py-3 text-sm font-medium ${
                  activeTab === 'photos'
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Photos
              </button>
            </div>

            <div className="p-6">
              {/* Expenses Tab */}
              {activeTab === 'expenses' && (
                <>
            {expenses.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">No expenses yet.</p>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {expense.receipts && expense.receipts.length > 0 ? (
                              <span className="text-xl flex-shrink-0">📷</span>
                            ) : (
                              <span className="text-xl flex-shrink-0">💰</span>
                            )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-base sm:text-sm truncate">{expense.description}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Paid by {expense.paid_by?.name || 'Unknown'}
                      </p>
                    </div>
                          </div>
                          <p className="text-lg sm:text-base font-bold text-right sm:text-left">{formatCurrency(expense.amount, event.currency)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Balances Tab */}
              {activeTab === 'balances' && (
                <>
                  {allBalanced ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">👍</span>
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">All good!</p>
                          <p className="text-sm text-green-600 dark:text-green-400">You don't need to balance</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Balances</h3>
                      <div className="relative group">
                        <button
                          type="button"
                          className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 text-xs font-medium flex items-center justify-center hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                          aria-label="Balance information"
                        >
                          ?
                        </button>
                        <div className="absolute left-0 bottom-full mb-2 w-56 p-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <p className="mb-1"><span className="text-green-400 font-semibold">Green (+)</span> = money you are supposed to receive</p>
                          <p><span className="text-red-400 font-semibold">Red (-)</span> = money you are supposed to pay up</p>
                          <div className="absolute left-2 bottom-0 transform translate-y-full">
                            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {balances.map((balance) => {
                      const participant = participants.find(p => p.id === balance.participantId);
                      const isMe = currentUserParticipant && participant?.id === currentUserParticipant.id;
                      const isPositive = balance.balance > 0.01;
                      const isNegative = balance.balance < -0.01;
                      const isZero = !isPositive && !isNegative;

                      return (
                        <div
                          key={balance.participantId}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            isMe 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                              : 'bg-gray-50 dark:bg-gray-700'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-white font-medium">
                            {balance.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">
                              {balance.name} {isMe && '(Me)'}
                            </p>
                          </div>
                          <div className={`text-lg font-bold ${
                            isPositive 
                              ? 'text-green-600 dark:text-green-400' 
                              : isNegative 
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {isPositive && '+'}
                            {formatCurrency(Math.abs(balance.balance), event.currency)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Photos Tab */}
              {activeTab === 'photos' && (
                <div>
                  {expenses.length === 0 || expenses.every(e => !e.receipts || e.receipts.length === 0) ? (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      No expenses with photos yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {expenses
                        .filter(e => e.receipts && e.receipts.length > 0)
                        .flatMap(e => e.receipts || [])
                        .map((receipt: any) => (
                          <div key={receipt.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                            <img
                              src={receipt.file_url}
                              alt="Receipt"
                              className="w-full h-full object-cover"
                            />
                  </div>
                ))}
              </div>
            )}
                </div>
              )}
            </div>
          </div>

          {/* Participants */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 sm:p-8 mb-6 border border-gray-200 dark:border-gray-700">
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
                    <div className="flex-1">
                      <p className="font-medium">{participant.name}</p>
                      {!participant.email && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 italic mt-0.5">
                          Added by organizer
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        participant.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}
                    >
                      {participant.payment_status === 'paid' ? 'Paid ✓' : 'Pending'}
                    </span>
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
                      {formatCurrency(settlement.amount, event.currency)}
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
