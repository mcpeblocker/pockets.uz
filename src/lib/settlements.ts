import { Expense, Participant, Settlement, ExpenseSplit } from './types';

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
 * V2: Now supports custom expense splits
 */
export function calculateBalances(
  participants: Participant[],
  expenses: Expense[],
  expenseSplits?: ExpenseSplit[]
): ParticipantBalance[] {
  // Initialize balances
  const balances: Record<string, number> = {};
  participants.forEach(p => {
    balances[p.id] = 0;
  });

  // Calculate what each person paid
  const participantPaid: Record<string, number> = {};
  participants.forEach(p => {
    participantPaid[p.id] = 0;
  });

  expenses.forEach(expense => {
    participantPaid[expense.paid_by_participant_id] = 
      (participantPaid[expense.paid_by_participant_id] || 0) + expense.amount;
  });

  // Calculate what each person owes based on splits
  const participantOwed: Record<string, number> = {};
  participants.forEach(p => {
    participantOwed[p.id] = 0;
  });

  if (expenseSplits && expenseSplits.length > 0) {
    // Use custom splits
    expenseSplits.forEach(split => {
      if (split.amount !== null) {
        participantOwed[split.participant_id] = 
          (participantOwed[split.participant_id] || 0) + split.amount;
      } else if (split.percentage !== null) {
        // Find the expense for this split
        const expense = expenses.find(e => e.id === split.expense_id);
        if (expense) {
          const amount = (expense.amount * split.percentage) / 100;
          participantOwed[split.participant_id] = 
            (participantOwed[split.participant_id] || 0) + amount;
        }
      }
    });
  } else {
    // Fall back to equal split (original behavior)
    expenses.forEach(expense => {
      const sharePerPerson = expense.amount / participants.length;
      participants.forEach(p => {
        participantOwed[p.id] = (participantOwed[p.id] || 0) + sharePerPerson;
      });
    });
  }

  // Calculate final balances (positive = owed money, negative = owes money)
  return participants.map(p => ({
    participantId: p.id,
    name: p.name,
    balance: participantPaid[p.id] - participantOwed[p.id],
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
 * V2: Now supports custom expense splits
 */
export function calculateSettlements(
  participants: Participant[],
  expenses: Expense[],
  expenseSplits?: ExpenseSplit[]
): MinimizedTransaction[] {
  if (participants.length === 0 || expenses.length === 0) {
    return [];
  }
  
  const balances = calculateBalances(participants, expenses, expenseSplits);
  return minimizeTransactions(balances);
}

/**
 * Validate expense splits to ensure they sum correctly
 */
export function validateExpenseSplits(
  expenseAmount: number,
  splits: Array<{ amount?: number; percentage?: number }>
): { valid: boolean; error?: string } {
  let totalAmount = 0;
  let totalPercentage = 0;

  for (const split of splits) {
    if (split.amount !== undefined && split.amount !== null) {
      if (split.amount < 0) {
        return { valid: false, error: 'Split amounts cannot be negative' };
      }
      totalAmount += split.amount;
    } else if (split.percentage !== undefined && split.percentage !== null) {
      if (split.percentage < 0 || split.percentage > 100) {
        return { valid: false, error: 'Split percentages must be between 0 and 100' };
      }
      totalPercentage += split.percentage;
    }
  }

  // Check if using amounts
  if (splits.some(s => s.amount !== undefined && s.amount !== null)) {
    if (Math.abs(totalAmount - expenseAmount) > 0.01) {
      return { 
        valid: false, 
        error: `Split amounts (${totalAmount.toFixed(2)}) must equal expense amount (${expenseAmount.toFixed(2)})` 
      };
    }
  } 
  // Check if using percentages
  else if (splits.some(s => s.percentage !== undefined && s.percentage !== null)) {
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return { 
        valid: false, 
        error: `Split percentages (${totalPercentage.toFixed(2)}%) must equal 100%` 
      };
    }
  }

  return { valid: true };
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
