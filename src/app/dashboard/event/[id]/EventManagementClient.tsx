"use client";

import { Fragment, useState, useEffect } from "react";
import { Event, Participant, Expense, Settlement } from "@/lib/types";
import {
  addExpense,
  updateExpense,
  deleteExpense,
  updatePaymentStatus,
  updateEmailNote,
  closeEvent,
  deleteEvent,
  addParticipant,
  deleteParticipant,
} from "@/app/actions/dashboard";
import { formatCurrency, CURRENCIES } from "@/lib/currency";
import Header from "@/components/Header";
import Link from "next/link";
import QRCode from "@/components/QRCode";
import { calculateBalances } from "@/lib/settlements";
import { scanReceipt, ExtractedReceiptData } from "@/lib/ocr";

interface EventManagementClientProps {
  event: Event;
  participants: Participant[];
  expenses: Array<Expense & { paid_by?: { id: string; name: string }; splits?: any[]; receipts?: any[] }>;
  settlements: Settlement[];
  initialShowQR?: boolean;
  currentUserId: string;
}

export default function EventManagementClient({
  event,
  participants,
  expenses,
  settlements,
  initialShowQR = false,
  currentUserId,
}: EventManagementClientProps) {
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "photos">("expenses");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<typeof expenses[0] | null>(null);
  const [showScanReceipt, setShowScanReceipt] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedData, setScannedData] = useState<ExtractedReceiptData | null>(null);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [showEmailNote, setShowEmailNote] = useState(false);
  const [showQRCode, setShowQRCode] = useState(initialShowQR);
  const [emailNote, setEmailNote] = useState(event.email_note || "");

  // Remove query param from URL when component mounts with showQR=true
  useEffect(() => {
    if (initialShowQR) {
      window.history.replaceState({}, '', `/dashboard/event/${event.id}`);
    }
  }, [initialShowQR, event.id]);
  const [expenseStatus, setExpenseStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [expenseMessage, setExpenseMessage] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [expensePhotos, setExpensePhotos] = useState<File[]>([]);
  const [splitEnabled, setSplitEnabled] = useState(true);
  const [splitType, setSplitType] = useState<"equal" | "custom" | "none">("equal");
  const [participantAmounts, setParticipantAmounts] = useState<Record<string, number>>({});
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [participantStatus, setParticipantStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [participantMessage, setParticipantMessage] = useState("");

  // Fallback copy function using temporary textarea
  function copyToClipboardFallback(text: string, button: HTMLButtonElement, originalText: string) {
    try {
      // Create a temporary textarea element
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      
      // Try to copy using execCommand
      let successful = false;
      try {
        successful = document.execCommand('copy');
      } catch (execErr) {
        console.error('execCommand error:', execErr);
      }
      
      document.body.removeChild(textarea);
      
      if (successful) {
        // Success feedback
        button.textContent = '✓ Copied!';
        button.className = 'text-xs text-green-600 hover:text-green-700 font-medium';
        setTimeout(() => {
          button.textContent = originalText;
          button.className = 'text-xs text-gray-500 hover:text-gray-700 underline';
        }, 2000);
      } else {
        // If all methods fail, show the URL in a way that's easy to copy
        button.textContent = 'Select URL';
        button.className = 'text-xs text-blue-600 hover:text-blue-700 underline';
        // Try to select the URL text
        const urlText = `${window.location.origin}/event/${event.slug}`;
        // Create a temporary input to show and select
        const input = document.createElement('input');
        input.value = urlText;
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        document.body.appendChild(input);
        input.select();
        input.setSelectionRange(0, urlText.length);
        setTimeout(() => {
          document.body.removeChild(input);
          button.textContent = originalText;
          button.className = 'text-xs text-gray-500 hover:text-gray-700 underline';
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      // Just show error state without alert
      button.textContent = 'Try again';
      button.className = 'text-xs text-orange-600 hover:text-orange-700 underline';
      setTimeout(() => {
        button.textContent = originalText;
        button.className = 'text-xs text-gray-500 hover:text-gray-700 underline';
      }, 2000);
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const sharePerPerson =
    participants.length > 0 ? totalExpenses / participants.length : 0;

  // Calculate balances for current user
  const currentUserParticipant = participants.find(p => p.user_id === currentUserId);
  const myExpenses = currentUserParticipant 
    ? expenses.filter(e => {
        // Check if user paid for it or is in the splits
        if (e.paid_by?.id === currentUserParticipant.id) return true;
        return e.splits?.some((s: any) => s.participant_id === currentUserParticipant.id);
      }).reduce((sum, e) => {
        // Calculate user's share of each expense
        if (e.paid_by?.id === currentUserParticipant.id) {
          // User paid, but may have split it
          const userSplit = e.splits?.find((s: any) => s.participant_id === currentUserParticipant.id);
          if (userSplit && userSplit.amount) {
            return sum + (e.amount - userSplit.amount); // What they paid minus their share
          }
          return sum + e.amount;
        }
        // User is in splits
        const userSplit = e.splits?.find((s: any) => s.participant_id === currentUserParticipant.id);
        return sum + (userSplit?.amount || 0);
      }, 0)
    : 0;

  // Get all expense splits for balance calculation
  const allSplits = expenses.flatMap(e => e.splits || []);
  const balances = calculateBalances(participants, expenses, allSplits);
  const currentUserBalance = balances.find(b => {
    const p = participants.find(p => p.id === b.participantId);
    return p?.user_id === currentUserId;
  });
  const allBalanced = balances.every(b => Math.abs(b.balance) < 0.01);

  async function handleAddExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setExpenseStatus("loading");

    const formData = new FormData(e.currentTarget);
    
    // Add date (currency will use event currency automatically)
    formData.append("expenseDate", expenseDate);
    
    // Handle splitting
    if (splitEnabled) {
      if (selectedParticipants.length === 0) {
        setExpenseStatus("error");
        setExpenseMessage("Please select at least one participant to split the expense among.");
        return;
      }
      
      if (splitType === "equal") {
        // Equal split - just pass participants
        formData.append("splitParticipants", JSON.stringify(selectedParticipants));
        formData.append("splitType", "equal");
      } else {
        // Custom split - pass individual amounts
        const amount = parseFloat(formData.get("amount") as string);
        const customSplits = selectedParticipants.map(pid => ({
          participantId: pid,
          amount: participantAmounts[pid] || 0
        }));
        
        // Validate custom splits sum to total
        const totalSplit = customSplits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(totalSplit - amount) > 0.01) {
          setExpenseStatus("error");
          setExpenseMessage(`Split amounts (${totalSplit.toFixed(2)}) must equal expense amount (${amount.toFixed(2)})`);
          return;
        }
        
        formData.append("splits", JSON.stringify(customSplits));
        formData.append("splitType", "custom");
      }
    } else {
      formData.append("splitType", "none");
    }
    
    // Add photos
    expensePhotos.forEach((photo, index) => {
      formData.append(`photo_${index}`, photo);
    });
    formData.append("photoCount", expensePhotos.length.toString());
    
    const result = await addExpense(formData);

    if (result.error) {
      setExpenseStatus("error");
      setExpenseMessage(result.error);
    } else {
      // Bug Fix #10: Upload photos if expense was created successfully with proper error handling
      if (result.expense && expensePhotos.length > 0) {
        try {
          const uploadResults = await Promise.allSettled(
            expensePhotos.map(async (photo) => {
              const uploadFormData = new FormData();
              uploadFormData.append('file', photo);
              uploadFormData.append('expenseId', result.expense.id);
              
              const uploadResponse = await fetch('/api/upload-receipt', {
                method: 'POST',
                body: uploadFormData,
              });
              
              if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to upload ${photo.name}`);
              }
              
              return { photo: photo.name, success: true };
            })
          );
          
          // Check for failed uploads
          const failedUploads = uploadResults
            .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
            .map((result) => result.reason?.message || 'Unknown error');
          
          if (failedUploads.length > 0) {
            setExpenseStatus("error");
            setExpenseMessage(
              `Expense created, but some photos failed to upload: ${failedUploads.join(', ')}`
            );
            // Don't reload - let user see the error and retry if needed
            return;
          }
        } catch (uploadError) {
          console.error('Error uploading photos:', uploadError);
          setExpenseStatus("error");
          setExpenseMessage(
            `Expense created, but photo upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
          );
          // Don't reload - let user see the error
          return;
        }
      }
      
      setExpenseStatus("success");
      setExpenseMessage("Expense added successfully!");
      setShowAddExpense(false);
      setSelectedParticipants([]);
      setExpensePhotos([]);
      setParticipantAmounts({});
      setSplitEnabled(true);
      setSplitType("equal");
      setExpenseDate(new Date().toISOString().split('T')[0]);
      window.location.reload();
    }
  }

  async function handleAddParticipant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setParticipantStatus("loading");

    const formData = new FormData(e.currentTarget);
    const result = await addParticipant(formData);

    if (result.error) {
      setParticipantStatus("error");
      setParticipantMessage(result.error);
    } else {
      setParticipantStatus("success");
      setParticipantMessage("Participant added successfully!");
      setShowAddParticipant(false);
      window.location.reload();
    }
  }

  async function handleEditExpense(expense: typeof expenses[0]) {
    setEditingExpense(expense);
    // Pre-fill form with expense data
    setExpenseDate(expense.expense_date || new Date(expense.created_at).toISOString().split('T')[0]);
    
    // Handle splits
    if (expense.splits && expense.splits.length > 0) {
      const splitAmounts = expense.splits.map((s: any) => s.amount || 0);
      const isEqual = splitAmounts.length > 1 && splitAmounts.every((amt: number) => Math.abs(amt - splitAmounts[0]) < 0.01);
      
      if (isEqual) {
        setSplitType("equal");
        setSplitEnabled(true);
        setSelectedParticipants(expense.splits.map((s: any) => s.participant_id));
      } else {
        setSplitType("custom");
        setSplitEnabled(true);
        setSelectedParticipants(expense.splits.map((s: any) => s.participant_id));
        const amounts: Record<string, number> = {};
        expense.splits.forEach((s: any) => {
          amounts[s.participant_id] = s.amount || 0;
        });
        setParticipantAmounts(amounts);
      }
    } else {
      // No splits - personal expense
      setSplitType("none");
      setSplitEnabled(false);
      setSelectedParticipants([]);
      setParticipantAmounts({});
    }
    
    setShowEditExpense(true);
  }

  async function handleUpdateExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingExpense) return;
    
    setExpenseStatus("loading");

    const formData = new FormData(e.currentTarget);
    
    // Add date
    formData.append("expenseDate", expenseDate);
    
    // Handle splitting
    if (splitEnabled) {
      if (selectedParticipants.length === 0) {
        setExpenseStatus("error");
        setExpenseMessage("Please select at least one participant to split the expense among.");
        return;
      }
      
      if (splitType === "equal") {
        formData.append("splitParticipants", JSON.stringify(selectedParticipants));
        formData.append("splitType", "equal");
      } else {
        const amount = parseFloat(formData.get("amount") as string);
        const customSplits = selectedParticipants.map(pid => ({
          participantId: pid,
          amount: participantAmounts[pid] || 0
        }));
        
        const totalSplit = customSplits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(totalSplit - amount) > 0.01) {
          setExpenseStatus("error");
          setExpenseMessage(`Split amounts (${totalSplit.toFixed(2)}) must equal expense amount (${amount.toFixed(2)})`);
          return;
        }
        
        formData.append("splits", JSON.stringify(customSplits));
        formData.append("splitType", "custom");
      }
    } else {
      formData.append("splitType", "none");
    }
    
    const result = await updateExpense(editingExpense.id, formData);

    if (result.error) {
      setExpenseStatus("error");
      setExpenseMessage(result.error);
    } else {
      setExpenseStatus("success");
      setExpenseMessage("Expense updated successfully!");
      setShowEditExpense(false);
      setEditingExpense(null);
      setSelectedParticipants([]);
      setParticipantAmounts({});
      setSplitEnabled(true);
      setSplitType("equal");
      setExpenseDate(new Date().toISOString().split('T')[0]);
      window.location.reload();
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    const result = await deleteExpense(expenseId, event.id);
    if (result.error) {
      alert(result.error);
    } else {
      window.location.reload();
    }
  }

  async function handleDeleteParticipant(participantId: string) {
    if (!confirm("Are you sure you want to remove this participant?")) {
      return;
    }

    const result = await deleteParticipant(participantId, event.id);
    if (result.error) {
      alert(result.error);
    } else {
      window.location.reload();
    }
  }

  async function handleUpdatePaymentStatus(
    participantId: string,
    status: "pending" | "paid"
  ) {
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
      alert("Email note saved!");
      setShowEmailNote(false);
      window.location.reload();
    }
  }

  async function handleCloseEvent() {
    if (
      !confirm(
        "Are you sure you want to close this event? Settlement emails will be sent to participants."
      )
    ) {
      return;
    }

    const result = await closeEvent(event.id);
    if (result.error) {
      alert(result.error);
    } else {
      alert("Event closed successfully! Settlement emails have been sent.");
      window.location.reload();
    }
  }

  async function handleDeleteEvent() {
    if (
      !confirm(
        "Are you sure you want to DELETE this event? This cannot be undone."
      )
    ) {
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
                  <p className="text-gray-600 dark:text-gray-400">
                    {event.description}
                  </p>
                )}
                <div className="text-sm text-gray-500 mt-2">
                  <span>Public URL: </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Link
                      href={`/event/${event.slug}`}
                      className="text-blue-600 hover:underline"
                      target="_blank"
                    >
                      /event/{event.slug}
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const fullUrl = typeof window !== 'undefined' 
                          ? `${window.location.origin}/event/${event.slug}`
                          : '';
                        const button = e.currentTarget;
                        const originalText = button.textContent || 'Copy URL';
                        
                        // Try modern clipboard API first
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(fullUrl)
                            .then(() => {
                              // Success feedback
                              button.textContent = '✓ Copied!';
                              button.className = 'text-xs text-green-600 hover:text-green-700 font-medium';
                              setTimeout(() => {
                                button.textContent = originalText;
                                button.className = 'text-xs text-gray-500 hover:text-gray-700 underline';
                              }, 2000);
                            })
                            .catch((err) => {
                              console.error('Clipboard API failed:', err);
                              // Fallback to old method
                              copyToClipboardFallback(fullUrl, button, originalText);
                            });
                        } else {
                          // Use fallback method
                          copyToClipboardFallback(fullUrl, button, originalText);
                        }
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 underline cursor-pointer"
                      title="Copy event URL"
                    >
                      Copy URL
                    </button>
                    <button
                      onClick={() => setShowQRCode(true)}
                      className="text-xs text-gray-500 hover:text-gray-700 underline cursor-pointer"
                      title="Show QR Code"
                    >
                      📱 QR Code
                    </button>
                  </div>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  event.status === "open"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                }`}
              >
                {event.status === "open" ? "Open" : "Closed"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Expenses
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalExpenses, event.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Participants
                </p>
                <p className="text-2xl font-bold">{participants.length}</p>
              </div>
            </div>

            {/* Action Buttons - Only for owners */}
            {event.owner_id === currentUserId && (
              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                {event.status === "open" && (
                  <Fragment>
                    <button
                      onClick={() => setShowEmailNote(true)}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg"
                    >
                      Edit Email Note
                    </button>
                    <button
                      onClick={handleCloseEvent}
                      disabled={
                        participants.length === 0 || expenses.length === 0
                      }
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg"
                    >
                      Close Event & Send Settlements
                    </button>
                  </Fragment>
                )}
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
                  This note will be included in the settlement email sent to
                  participants.
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
                      setEmailNote(event.email_note || "");
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* QR Code Modal */}
          {showQRCode && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
                <h2 className="text-xl font-bold mb-2">Event QR Code</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Scan this QR code to quickly access the event
                </p>
                <div className="flex flex-col items-center mb-4">
                  {typeof window !== 'undefined' && (
                    <QRCode
                      value={`${window.location.origin}/event/${event.slug}`}
                      size={256}
                      className="mb-4"
                    />
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center break-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/event/${event.slug}` : ''}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const fullUrl = typeof window !== 'undefined' 
                        ? `${window.location.origin}/event/${event.slug}`
                        : '';
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(fullUrl).catch(() => {});
                      }
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
                  >
                    Copy URL
                  </button>
                  <button
                    onClick={() => setShowQRCode(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Expense Buttons - Visible to all participants when event is open */}
          {event.status === "open" && participants.length > 0 && (
            <div className="mb-6 flex gap-3">
              <button
                onClick={() => setShowAddExpense(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg"
              >
                Add Expense
              </button>
              <button
                onClick={() => setShowScanReceipt(true)}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                📷 Scan Receipt
              </button>
            </div>
          )}

          {/* Add Participant Button - Only for owners */}
          {event.status === "open" && event.owner_id === currentUserId && (
            <div className="mb-6">
              <button
                onClick={() => setShowAddParticipant(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg"
              >
                Add Participant Manually
              </button>
            </div>
          )}

          {/* Add Expense Form Modal */}
          {showAddExpense && event.status === "open" && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full my-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Add Expense</h2>
                  <button
                    onClick={() => {
                      setShowAddExpense(false);
                      setExpenseStatus("idle");
                      setExpenseMessage("");
                      setSelectedParticipants([]);
                      setExpensePhotos([]);
                      setParticipantAmounts({});
                      setSplitEnabled(true);
                      setSplitType("equal");
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleAddExpense} className="space-y-6">
                  <input type="hidden" name="eventId" value={event.id} />

                  {/* Title */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium mb-2">
                      Title *
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="description"
                        name="description"
                        type="text"
                        required
                        placeholder="E.g. Drinks"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      />
                      <button
                        type="button"
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        title="Category"
                      >
                        🏷️
                      </button>
                      <button
                        type="button"
                        onClick={() => document.getElementById('expensePhotos')?.click()}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        title="Add Photo"
                      >
                        📷
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium mb-2">
                      Amount *
                    </label>
                    <input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 text-lg"
                    />
                  </div>

                  {/* Paid By & When */}
                  <div className="grid grid-cols-2 gap-4">
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
                            {p.name} {p.user_id === currentUserId ? "(me)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="expenseDate" className="block text-sm font-medium mb-2">
                        When *
                      </label>
                      <input
                        id="expenseDate"
                        name="expenseDate"
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      />
                    </div>
                  </div>

                  {/* Split Expense */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="splitEnabled"
                        checked={splitEnabled}
                        onChange={(e) => {
                          setSplitEnabled(e.target.checked);
                          if (!e.target.checked) {
                            setSelectedParticipants([]);
                            setParticipantAmounts({});
                          }
                        }}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="splitEnabled" className="text-sm font-medium">
                        Split
                      </label>
                      {splitEnabled && (
                        <div className="flex-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSplitType("equal")}
                            className={`px-3 py-1 rounded text-sm ${
                              splitType === "equal"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            Equally
                          </button>
                          <button
                            type="button"
                            onClick={() => setSplitType("custom")}
                            className="text-gray-500 hover:text-gray-700"
                            title="Custom Split"
                          >
                            ⇄
                          </button>
                        </div>
                      )}
                    </div>

                    {splitEnabled && (
                      <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        {participants.map((p) => {
                          const isSelected = selectedParticipants.includes(p.id);
                          const amount = participantAmounts[p.id] || 0;
                          const totalAmount = parseFloat((document.getElementById('amount') as HTMLInputElement)?.value || '0');
                          const equalAmount = selectedParticipants.length > 0 && splitType === "equal"
                            ? totalAmount / selectedParticipants.length
                            : 0;

                          return (
                            <div key={p.id} className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedParticipants([...selectedParticipants, p.id]);
                                    if (splitType === "equal") {
                                      // Will be calculated on submit
                                    } else {
                                      setParticipantAmounts({...participantAmounts, [p.id]: 0});
                                    }
                                  } else {
                                    setSelectedParticipants(selectedParticipants.filter(id => id !== p.id));
                                    const newAmounts = {...participantAmounts};
                                    delete newAmounts[p.id];
                                    setParticipantAmounts(newAmounts);
                                  }
                                }}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <label className="flex-1 text-sm">
                                {p.name} {p.user_id === currentUserId ? "(me)" : ""}
                              </label>
                              {isSelected && (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={splitType === "equal" ? equalAmount.toFixed(2) : amount}
                                  onChange={(e) => {
                                    if (splitType === "custom") {
                                      setParticipantAmounts({
                                        ...participantAmounts,
                                        [p.id]: parseFloat(e.target.value) || 0
                                      });
                                    }
                                  }}
                                  disabled={splitType === "equal"}
                                  className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700"
                                  placeholder="0.00"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input
                    id="expensePhotos"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setExpensePhotos(files);
                    }}
                    className="hidden"
                  />
                  {expensePhotos.length > 0 && (
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      {expensePhotos.length} file(s) selected
                    </div>
                  )}

                  {expenseStatus === "error" && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
                      {expenseMessage}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={expenseStatus === "loading"}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg"
                    >
                      {expenseStatus === "loading" ? "Adding..." : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddExpense(false);
                        setExpenseStatus("idle");
                        setExpenseMessage("");
                        setSelectedParticipants([]);
                        setExpensePhotos([]);
                        setParticipantAmounts({});
                        setSplitEnabled(true);
                        setSplitType("equal");
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Expense Form Modal */}
          {showEditExpense && editingExpense && event.status === "open" && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full my-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Edit Expense</h2>
                  <button
                    onClick={() => {
                      setShowEditExpense(false);
                      setEditingExpense(null);
                      setExpenseStatus("idle");
                      setExpenseMessage("");
                      setSelectedParticipants([]);
                      setParticipantAmounts({});
                      setSplitEnabled(true);
                      setSplitType("equal");
                      setExpenseDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleUpdateExpense} className="space-y-6">
                  <input type="hidden" name="eventId" value={event.id} />

                  {/* Title */}
                  <div>
                    <label htmlFor="edit-description" className="block text-sm font-medium mb-2">
                      Title *
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="edit-description"
                        name="description"
                        type="text"
                        required
                        defaultValue={editingExpense.description}
                        placeholder="E.g. Drinks"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      />
                      <button
                        type="button"
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        title="Category"
                      >
                        🏷️
                      </button>
                      <button
                        type="button"
                        onClick={() => document.getElementById('edit-expensePhotos')?.click()}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        title="Add Photo"
                      >
                        📷
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label htmlFor="edit-amount" className="block text-sm font-medium mb-2">
                      Amount * ({event.currency})
                    </label>
                    <input
                      id="edit-amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      defaultValue={editingExpense.amount}
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 text-lg"
                    />
                  </div>

                  {/* Paid By & When */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-paidByParticipantId" className="block text-sm font-medium mb-2">
                        Paid By *
                      </label>
                      <select
                        id="edit-paidByParticipantId"
                        name="paidByParticipantId"
                        required
                        defaultValue={editingExpense.paid_by_participant_id}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      >
                        <option value="">Select participant</option>
                        {participants.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.user_id === currentUserId ? "(me)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="edit-expenseDate" className="block text-sm font-medium mb-2">
                        When *
                      </label>
                      <input
                        id="edit-expenseDate"
                        name="expenseDate"
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      />
                    </div>
                  </div>

                  {/* Split Expense */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="edit-splitEnabled"
                        checked={splitEnabled}
                        onChange={(e) => {
                          setSplitEnabled(e.target.checked);
                          if (!e.target.checked) {
                            setSelectedParticipants([]);
                            setParticipantAmounts({});
                          }
                        }}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="edit-splitEnabled" className="text-sm font-medium">
                        Split
                      </label>
                      {splitEnabled && (
                        <div className="flex-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSplitType("equal")}
                            className={`px-3 py-1 rounded text-sm ${
                              splitType === "equal"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            Equally
                          </button>
                          <button
                            type="button"
                            onClick={() => setSplitType("custom")}
                            className={`px-3 py-1 rounded text-sm ${
                              splitType === "custom"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            }`}
                            title="Custom Split"
                          >
                            ⇄
                          </button>
                        </div>
                      )}
                    </div>

                    {splitEnabled && (
                      <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        {participants.map((p) => {
                          const isSelected = selectedParticipants.includes(p.id);
                          const amount = participantAmounts[p.id] || 0;
                          const totalAmount = parseFloat((document.getElementById('edit-amount') as HTMLInputElement)?.value || String(editingExpense.amount));
                          const equalAmount = selectedParticipants.length > 0 && splitType === "equal"
                            ? totalAmount / selectedParticipants.length
                            : 0;

                          return (
                            <div key={p.id} className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedParticipants([...selectedParticipants, p.id]);
                                    if (splitType === "equal") {
                                      // Will be calculated on submit
                                    } else {
                                      setParticipantAmounts({...participantAmounts, [p.id]: 0});
                                    }
                                  } else {
                                    setSelectedParticipants(selectedParticipants.filter(id => id !== p.id));
                                    const newAmounts = {...participantAmounts};
                                    delete newAmounts[p.id];
                                    setParticipantAmounts(newAmounts);
                                  }
                                }}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <label className="flex-1 text-sm">
                                {p.name} {p.user_id === currentUserId ? "(me)" : ""}
                              </label>
                              {isSelected && (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={splitType === "equal" ? equalAmount.toFixed(2) : amount}
                                  onChange={(e) => {
                                    if (splitType === "custom") {
                                      setParticipantAmounts({
                                        ...participantAmounts,
                                        [p.id]: parseFloat(e.target.value) || 0
                                      });
                                    }
                                  }}
                                  disabled={splitType === "equal"}
                                  className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700"
                                  placeholder="0.00"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Hidden file input for editing (new photos can be added) */}
                  <input
                    id="edit-expensePhotos"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      if (e.target.files) {
                        setExpensePhotos(Array.from(e.target.files));
                      }
                    }}
                    className="hidden"
                  />
                  {expensePhotos.length > 0 && (
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      {expensePhotos.length} new file(s) selected (will be added to existing receipts)
                    </div>
                  )}

                  {expenseStatus === "error" && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
                      {expenseMessage}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={expenseStatus === "loading"}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg"
                    >
                      {expenseStatus === "loading" ? "Updating..." : "Update"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditExpense(false);
                        setEditingExpense(null);
                        setExpenseStatus("idle");
                        setExpenseMessage("");
                        setSelectedParticipants([]);
                        setExpensePhotos([]);
                        setParticipantAmounts({});
                        setSplitEnabled(true);
                        setSplitType("equal");
                        setExpenseDate(new Date().toISOString().split('T')[0]);
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Scan Receipt Modal */}
          {showScanReceipt && event.status === "open" && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full my-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Scan Receipt</h2>
                  <button
                    onClick={() => {
                      setShowScanReceipt(false);
                      setScanningReceipt(false);
                      setScanProgress(0);
                      setScannedData(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>

                {!scannedData ? (
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="receiptFile" className="block text-sm font-medium mb-2">
                        Upload Receipt Image
                      </label>
                      <input
                        id="receiptFile"
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          setScanningReceipt(true);
                          setScanProgress(0);

                          try {
                            console.log('Starting OCR scan for file:', file.name);
                            const data = await scanReceipt(file, (progress) => {
                              setScanProgress(progress);
                            });

                            console.log('OCR scan completed successfully:', data);
                            setScannedData(data);
                            setScanningReceipt(false);
                          } catch (error) {
                            console.error('OCR scan error:', error);
                            setExpenseStatus("error");
                            setExpenseMessage(
                              error instanceof Error ? error.message : "Failed to scan receipt"
                            );
                            setScanningReceipt(false);
                            setScannedData(null);
                          }
                        }}
                        disabled={scanningReceipt}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      />
                    </div>

                    {scanningReceipt && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Scanning receipt...</span>
                          <span>{Math.round(scanProgress * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${scanProgress * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Upload a clear photo of your receipt. We'll extract the amount, date, and merchant information automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <p className="text-green-800 dark:text-green-200 font-medium mb-2">
                        ✓ Receipt scanned successfully!
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Review the extracted information below and click "Use This Data" to pre-fill the expense form.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Amount</label>
                        <div className="text-lg font-bold">
                          {scannedData.amount
                            ? formatCurrency(scannedData.amount, event.currency)
                            : "Not found"}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <div>{scannedData.date || "Not found"}</div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Merchant</label>
                        <div>{scannedData.merchant || "Not found"}</div>
                      </div>

                      {scannedData.items.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Items Found</label>
                          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                            {scannedData.items.slice(0, 5).map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <details className="text-sm">
                        <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                          View raw OCR text
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto max-h-40">
                          {scannedData.rawText}
                        </pre>
                      </details>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => {
                          // Pre-fill the expense form with scanned data
                          if (scannedData.amount) {
                            const amountInput = document.getElementById('amount') as HTMLInputElement;
                            if (amountInput) amountInput.value = scannedData.amount.toString();
                          }

                          if (scannedData.date) {
                            setExpenseDate(scannedData.date);
                          }

                          const descriptionInput = document.getElementById('description') as HTMLInputElement;
                          if (descriptionInput && scannedData.merchant) {
                            descriptionInput.value = scannedData.merchant;
                          }

                          // Close scan modal and open expense form
                          setShowScanReceipt(false);
                          setScannedData(null);
                          setShowAddExpense(true);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg"
                      >
                        Use This Data
                      </button>
                      <button
                        onClick={() => {
                          setScannedData(null);
                          setScanProgress(0);
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Scan Another
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Participant Form */}
          {showAddParticipant && event.status === "open" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Add Participant Manually</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Add participants who agreed to split but haven't joined via the public link.
              </p>
              <form onSubmit={handleAddParticipant} className="space-y-4">
                <input type="hidden" name="eventId" value={event.id} />

                <div>
                  <label
                    htmlFor="participantName"
                    className="block text-sm font-medium mb-2"
                  >
                    Name *
                  </label>
                  <input
                    id="participantName"
                    name="name"
                    type="text"
                    required
                    placeholder="John Doe"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="participantEmail"
                    className="block text-sm font-medium mb-2"
                  >
                    Email (optional)
                  </label>
                  <input
                    id="participantEmail"
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty if you don't have their email. They won't receive settlement notifications.
                  </p>
                </div>

                {participantStatus === "error" && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
                    {participantMessage}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={participantStatus === "loading"}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-2 px-4 rounded-lg"
                  >
                    {participantStatus === "loading" ? "Adding..." : "Add Participant"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddParticipant(false);
                      setParticipantStatus("idle");
                      setParticipantMessage("");
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
          {participants.length === 0 && event.status === "open" && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 dark:text-yellow-200">
                ⚠️ No participants yet. Share the event link with people to
                join!
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-6">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab("expenses")}
                className={`flex-1 px-6 py-3 text-sm font-medium ${
                  activeTab === "expenses"
                    ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setActiveTab("balances")}
                className={`flex-1 px-6 py-3 text-sm font-medium ${
                  activeTab === "balances"
                    ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                Balances
              </button>
              <button
                onClick={() => setActiveTab("photos")}
                className={`flex-1 px-6 py-3 text-sm font-medium ${
                  activeTab === "photos"
                    ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                Photos
              </button>
            </div>

            <div className="p-6">
              {/* Expenses Tab */}
              {activeTab === "expenses" && (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">My Expenses</p>
                      <p className="text-2xl font-bold">{formatCurrency(myExpenses, event.currency)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Expenses</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalExpenses, event.currency)}</p>
                    </div>
                  </div>

                  {/* Expenses List */}
                  {expenses.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      No expenses yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {/* Group by date */}
                      {(() => {
                        const grouped = expenses.reduce((acc, expense) => {
                          const date = expense.expense_date 
                            ? new Date(expense.expense_date).toLocaleDateString()
                            : new Date(expense.created_at).toLocaleDateString();
                          if (!acc[date]) acc[date] = [];
                          acc[date].push(expense);
                          return acc;
                        }, {} as Record<string, typeof expenses>);

                        return Object.entries(grouped).map(([date, dateExpenses]) => (
                          <div key={date} className="mb-6">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                              {date === new Date().toLocaleDateString() ? "Today" : date}
                            </h3>
                            <div className="space-y-2">
                              {dateExpenses.map((expense) => (
                                <div
                                  key={expense.id}
                                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                    {expense.receipts && expense.receipts.length > 0 ? "📷" : "💰"}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium">{expense.description}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      Paid by {expense.paid_by?.name || "Unknown"}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <p className="text-lg font-bold">
                                      {formatCurrency(expense.amount, expense.currency || event.currency)}
                                    </p>
                                    {event.status === "open" && (
                                      <div className="flex items-center gap-2">
                                        {(event.owner_id === currentUserId || (expense as any).created_by === currentUserId) && (
                                          <button
                                            onClick={() => handleEditExpense(expense)}
                                            className="text-blue-600 hover:text-blue-700 text-sm"
                                          >
                                            Edit
                                          </button>
                                        )}
                                        {event.owner_id === currentUserId && (
                                          <button
                                            onClick={() => handleDeleteExpense(expense.id)}
                                            className="text-red-600 hover:text-red-700 text-sm"
                                          >
                                            Delete
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </>
              )}

              {/* Balances Tab */}
              {activeTab === "balances" && (
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
                  ) : (
                    <div className="mb-6">
                      <button className="text-blue-600 dark:text-blue-400 text-sm hover:underline">
                        View All Suggested Reimbursements
                      </button>
                    </div>
                  )}

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
                      const isMe = participant?.user_id === currentUserId;
                      const isPositive = balance.balance > 0.01;
                      const isNegative = balance.balance < -0.01;
                      const isZero = !isPositive && !isNegative;

                      return (
                        <div
                          key={balance.participantId}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-white font-medium">
                            {balance.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">
                              {balance.name} {isMe && "(Me)"}
                            </p>
                          </div>
                          <div className={`text-lg font-bold ${
                            isPositive 
                              ? "text-green-600 dark:text-green-400" 
                              : isNegative 
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-500 dark:text-gray-400"
                          }`}>
                            {isPositive && "+"}
                            {formatCurrency(Math.abs(balance.balance), event.currency)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Photos Tab */}
              {activeTab === "photos" && (
                <div>
                  {expenses.length === 0 ? (
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Participants</h2>
            {participants.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">
                No participants yet.
              </p>
            ) : (
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{participant.name}</p>
                      {participant.email ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {participant.email}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-500 italic">
                          No email (won't receive settlement notifications)
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          handleUpdatePaymentStatus(
                            participant.id,
                            participant.payment_status === "paid"
                              ? "pending"
                              : "paid"
                          )
                        }
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          participant.payment_status === "paid"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 hover:bg-yellow-200"
                        }`}
                      >
                        {participant.payment_status === "paid"
                          ? "Paid ✓"
                          : "Mark as Paid"}
                      </button>
                      {event.status === "open" && (
                        <button
                          onClick={() => handleDeleteParticipant(participant.id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settlements (only shown when event is closed) */}
          {event.status === "closed" && settlements.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">Settlement Summary</h2>
              <div className="space-y-3">
                {settlements.map((settlement) => (
                  <div
                    key={settlement.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <p>
                      <span className="font-medium">
                        {settlement.from_name}
                      </span>
                      {" pays "}
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
