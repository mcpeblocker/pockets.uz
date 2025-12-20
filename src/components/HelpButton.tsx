'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function HelpButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg flex items-center justify-center text-xl sm:text-2xl font-bold z-40 transition-all hover:scale-110 active:scale-95"
        aria-label="Open help and instructions"
        title="Help & Instructions"
      >
        ?
      </button>

      {/* Instructions Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-bold">How to Use Pockets</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-2">For Participants</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>Click the event link shared by the organizer</li>
                  <li>Click &quot;Join This Event&quot; and enter your name and contact info</li>
                  <li>View all expenses and see your share</li>
                  <li>When the event closes, you&apos;ll receive settlement instructions via email</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-2">For Organizers</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>Sign in with your email (magic link, no password needed)</li>
                  <li>Create a new event from your dashboard</li>
                  <li>Share the event link with participants</li>
                  <li>Add expenses as they occur</li>
                  <li>When ready, close the event to calculate and send settlements</li>
                  <li>Mark payments as &quot;paid&quot; as people settle up</li>
                </ol>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-bold mb-2">💡 Key Features</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>No registration required to participate</li>
                  <li>Expenses are split equally among all participants</li>
                  <li>Smart settlement algorithm minimizes transactions</li>
                  <li>Automatic email notifications when events close</li>
                  <li>Track payment status easily</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-bold mb-2">Need More Help?</h3>
                <div className="flex gap-3">
                  <Link
                    href="/faq"
                    className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-center py-2 px-4 rounded-lg transition-colors"
                    onClick={() => setShowModal(false)}
                  >
                    View FAQ
                  </Link>
                  <Link
                    href="/#support"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-lg transition-colors"
                    onClick={() => setShowModal(false)}
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
