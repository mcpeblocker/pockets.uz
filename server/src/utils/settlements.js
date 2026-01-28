// Settlement calculation logic
export function calculateSettlements(participants, expenses) {
  // Calculate balances for each participant
  const balances = {};
  participants.forEach(p => {
    balances[p.id] = 0;
  });

  // Track what each participant paid
  const paid = {};
  participants.forEach(p => {
    paid[p.id] = 0;
  });

  // Track what each participant owes
  const owed = {};
  participants.forEach(p => {
    owed[p.id] = 0;
  });

  // Process expenses
  expenses.forEach(expense => {
    // Add to paid amount
    paid[expense.paid_by_participant_id] = (paid[expense.paid_by_participant_id] || 0) + expense.amount;

    // Process splits
    if (expense.split_amount !== null && expense.split_amount !== undefined) {
      // Equal split
      owed[expense.participant_id] = (owed[expense.participant_id] || 0) + expense.split_amount;
    } else if (expense.percentage !== null && expense.percentage !== undefined) {
      // Percentage split
      const amount = (expense.amount * expense.percentage) / 100;
      owed[expense.participant_id] = (owed[expense.participant_id] || 0) + amount;
    } else {
      // No split - personal expense
      owed[expense.paid_by_participant_id] = (owed[expense.paid_by_participant_id] || 0) + expense.amount;
    }
  });

  // Calculate final balances
  participants.forEach(p => {
    balances[p.id] = paid[p.id] - owed[p.id];
  });

  // Minimize transactions
  return minimizeTransactions(participants, balances);
}

function minimizeTransactions(participants, balances) {
  const settlements = [];
  const debtors = [];
  const creditors = [];

  // Separate debtors and creditors
  participants.forEach(p => {
    const balance = balances[p.id] || 0;
    if (balance < -0.01) {
      debtors.push({ ...p, balance: Math.abs(balance) });
    } else if (balance > 0.01) {
      creditors.push({ ...p, balance });
    }
  });

  // Sort by balance (largest first)
  debtors.sort((a, b) => b.balance - a.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  // Minimize transactions
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const amount = Math.min(debtor.balance, creditor.balance);

    settlements.push({
      from_participant_id: debtor.id,
      to_participant_id: creditor.id,
      from_name: debtor.name,
      to_name: creditor.name,
      amount: Math.round(amount * 100) / 100
    });

    debtor.balance -= amount;
    creditor.balance -= amount;

    if (debtor.balance < 0.01) {
      debtorIndex++;
    }
    if (creditor.balance < 0.01) {
      creditorIndex++;
    }
  }

  return settlements;
}
