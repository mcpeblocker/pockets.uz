import { Expense, Participant, Settlement } from './types';

export interface ParticipantBalance {
  participantId: string;
  name: string;
  balance: number; // positive = owed money, negative = owes money
}

export interface MinimizedTransaction {
  fromParticipantId: string;
  toParticipantId: string;
  fromName: string;
  toName: string;
  amount: number;
}

/**
 * Calculate how much each participant owes or is owed
 */
export function calculateBalances(
  participants: Participant[],
  expenses: Expense[]
): ParticipantBalance[] {
  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Calculate per-person share
  const sharePerPerson = totalExpenses / participants.length;
  
  // Calculate what each person paid
  const participantPaid: Record<string, number> = {};
  participants.forEach(p => {
    participantPaid[p.id] = 0;
  });
  
  expenses.forEach(expense => {
    participantPaid[expense.paid_by_participant_id] = 
      (participantPaid[expense.paid_by_participant_id] || 0) + expense.amount;
  });
  
  // Calculate balances
  return participants.map(p => ({
    participantId: p.id,
    name: p.name,
    balance: participantPaid[p.id] - sharePerPerson,
  }));
}

/**
 * Minimize the number of transactions needed to settle debts
 * Uses a greedy algorithm to match largest debtors with largest creditors
 */
export function minimizeTransactions(balances: ParticipantBalance[]): MinimizedTransaction[] {
  const transactions: MinimizedTransaction[] = [];
  
  // Create working copy of balances
  const workingBalances = balances.map(b => ({ ...b }));
  
  // Sort by balance (descending)
  workingBalances.sort((a, b) => b.balance - a.balance);
  
  let i = 0; // Index for creditors (positive balance)
  let j = workingBalances.length - 1; // Index for debtors (negative balance)
  
  while (i < j) {
    const creditor = workingBalances[i];
    const debtor = workingBalances[j];
    
    // Skip if balance is essentially zero
    if (Math.abs(creditor.balance) < 0.01) {
      i++;
      continue;
    }
    if (Math.abs(debtor.balance) < 0.01) {
      j--;
      continue;
    }
    
    // Skip if creditor has negative balance
    if (creditor.balance <= 0) {
      i++;
      continue;
    }
    
    // Skip if debtor has positive balance
    if (debtor.balance >= 0) {
      j--;
      continue;
    }
    
    // Calculate transaction amount
    const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
    
    if (amount > 0.01) { // Only create transaction if amount is significant
      transactions.push({
        fromParticipantId: debtor.participantId,
        toParticipantId: creditor.participantId,
        fromName: debtor.name,
        toName: creditor.name,
        amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
      });
      
      // Update balances
      creditor.balance -= amount;
      debtor.balance += amount;
    }
    
    // Move pointers
    if (Math.abs(creditor.balance) < 0.01) i++;
    if (Math.abs(debtor.balance) < 0.01) j--;
  }
  
  return transactions;
}

/**
 * Calculate settlements for an event
 */
export function calculateSettlements(
  participants: Participant[],
  expenses: Expense[]
): MinimizedTransaction[] {
  if (participants.length === 0 || expenses.length === 0) {
    return [];
  }
  
  const balances = calculateBalances(participants, expenses);
  return minimizeTransactions(balances);
}

/**
 * Get settlement summary for a participant
 */
export function getParticipantSettlements(
  participantId: string,
  settlements: Settlement[]
): {
  toPay: Settlement[];
  toReceive: Settlement[];
  totalToPay: number;
  totalToReceive: number;
} {
  const toPay = settlements.filter(s => s.from_participant_id === participantId);
  const toReceive = settlements.filter(s => s.to_participant_id === participantId);
  
  const totalToPay = toPay.reduce((sum, s) => sum + s.amount, 0);
  const totalToReceive = toReceive.reduce((sum, s) => sum + s.amount, 0);
  
  return {
    toPay,
    toReceive,
    totalToPay,
    totalToReceive,
  };
}
