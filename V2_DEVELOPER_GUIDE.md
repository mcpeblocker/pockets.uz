# Pockets V2 - Developer Quick Reference

## Quick Start

### 1. Run Database Migration
```sql
-- In Supabase SQL Editor, run:
supabase/migrations/20240101000000_v2_schema_upgrade.sql
```

### 2. Update Imports
```typescript
// Use new types
import { ExpenseWithDetails, ExpenseFormData, ExpenseCategory } from '@/lib/types';

// Use new functions
import { updateExpense, updateParticipant, reopenEvent } from '@/app/actions/dashboard';
import { exportEventToCSV } from '@/lib/export';
```

## Key Functions Reference

### Expense Management

#### Add Expense (Enhanced)
```typescript
const formData = new FormData();
formData.append('eventId', eventId);
formData.append('description', 'Dinner');
formData.append('amount', '100.00');
formData.append('paidByParticipantId', participantId);
formData.append('expenseDate', '2024-01-15'); // NEW
formData.append('categoryId', categoryId); // NEW
formData.append('splitType', 'custom'); // NEW: 'equal' or 'custom'
formData.append('splits', JSON.stringify([ // NEW: for custom splits
  { participantId: 'id1', amount: 50 },
  { participantId: 'id2', amount: 50 }
]));

const result = await addExpense(formData);
```

#### Update Expense (NEW)
```typescript
const formData = new FormData();
// Same fields as addExpense
const result = await updateExpense(expenseId, formData);
```

#### Delete Expense
```typescript
const result = await deleteExpense(expenseId, eventId);
```

### Participant Management

#### Add Participant (Enhanced - Duplicate Prevention)
```typescript
const formData = new FormData();
formData.append('eventId', eventId);
formData.append('name', 'John Doe');
formData.append('email', 'john@example.com'); // Optional but recommended

const result = await addParticipant(formData);
// Returns error if email already exists in event
```

#### Update Participant (NEW)
```typescript
const formData = new FormData();
formData.append('name', 'John Smith');
formData.append('email', 'john.smith@example.com');

const result = await updateParticipant(participantId, eventId, formData);
```

#### Delete Participant
```typescript
const result = await deleteParticipant(participantId, eventId);
// Validates no expenses associated
```

### Event Management

#### Close Event (Enhanced - Custom Splits)
```typescript
const result = await closeEvent(eventId);
// Automatically handles custom splits in settlement calculation
```

#### Reopen Event (NEW)
```typescript
const result = await reopenEvent(eventId);
// Allows editing after closing
```

### Categories

#### Create Category
```typescript
const result = await createExpenseCategory(
  eventId,
  'Food',
  '#FF5733', // color (optional)
  '🍔' // icon (optional)
);
```

#### Get Categories
```typescript
const categories = await getExpenseCategories(eventId);
```

### Export

#### Export to CSV
```typescript
import { exportEventToCSV } from '@/lib/export';

const data = {
  event,
  participants,
  expenses,
  settlements,
  categories
};

exportEventToCSV(data);
// Automatically triggers download
```

#### Export to Text
```typescript
import { exportEventToText } from '@/lib/export';

exportEventToText(data);
```

## Data Structures

### Expense with Details
```typescript
interface ExpenseWithDetails extends Expense {
  paid_by?: { id: string; name: string };
  category?: ExpenseCategory | null;
  splits?: Array<ExpenseSplit & { participant: { id: string; name: string } }>;
  receipts?: Receipt[];
}
```

### Expense Form Data
```typescript
interface ExpenseFormData {
  description: string;
  amount: number;
  paidByParticipantId: string;
  expenseDate?: string;
  categoryId?: string | null;
  splitType: 'equal' | 'custom';
  splits?: Array<{
    participantId: string;
    amount?: number;
    percentage?: number;
  }>;
}
```

## Custom Splits

### Equal Split (Default)
```typescript
formData.append('splitType', 'equal');
// No splits needed - automatically divides equally
```

### Custom Amount Split
```typescript
formData.append('splitType', 'custom');
formData.append('splits', JSON.stringify([
  { participantId: 'id1', amount: 60 },
  { participantId: 'id2', amount: 40 }
]));
// Total must equal expense amount
```

### Custom Percentage Split
```typescript
formData.append('splitType', 'custom');
formData.append('splits', JSON.stringify([
  { participantId: 'id1', percentage: 60 },
  { participantId: 'id2', percentage: 40 }
]));
// Total must equal 100%
```

## Validation

### Split Validation
```typescript
import { validateExpenseSplits } from '@/lib/settlements';

const validation = validateExpenseSplits(100, [
  { amount: 60 },
  { amount: 40 }
]);

if (!validation.valid) {
  console.error(validation.error);
}
```

## Error Handling

All functions return:
```typescript
{ success: true, ...data } | { error: string }
```

Example:
```typescript
const result = await addExpense(formData);

if (result.error) {
  // Handle error
  console.error(result.error);
  return;
}

// Success
console.log('Expense added:', result.expense);
```

## Common Patterns

### Fetch Event with All Data
```typescript
const event = await getEventBySlug(slug);
const participants = await getEventParticipants(event.id);
const expenses = await getEventExpenses(event.id); // Includes splits, categories
const settlements = await getEventSettlements(event.id); // Includes transactions
const categories = await getExpenseCategories(event.id);
```

### Check if Participant Already Joined
```typescript
import { getParticipantByEmail } from '@/app/actions/events';

const existing = await getParticipantByEmail(email, eventId);
if (existing) {
  // Already joined
}
```

### Get Participant by Token
```typescript
import { getParticipantByToken } from '@/app/actions/events';

const participant = await getParticipantByToken(token, eventId);
```

## Database Queries

### Get Expenses with Splits
```typescript
const { data: expenses } = await supabase
  .from('expenses')
  .select(`
    *,
    paid_by:participants!expenses_paid_by_participant_id_fkey(id, name),
    category:expense_categories(*),
    splits:expense_splits(*, participant:participants(id, name)),
    receipts:receipts(*)
  `)
  .eq('event_id', eventId);
```

### Get Settlements with Transactions
```typescript
const { data: settlements } = await supabase
  .from('settlements')
  .select(`
    *,
    transaction:settlement_transactions(*)
  `)
  .eq('event_id', eventId);
```

## Event History

All actions are automatically logged. To view:
```typescript
const { data: history } = await supabase
  .from('event_history')
  .select('*')
  .eq('event_id', eventId)
  .order('created_at', { ascending: false });
```

## Tips

1. **Always validate splits** before saving
2. **Check for duplicates** before adding participants
3. **Use participant tokens** for better identification
4. **Export data** before major changes
5. **Check event status** before allowing edits
6. **Use categories** to organize expenses
7. **Set expense dates** for better tracking

## Troubleshooting

### "Duplicate participant" error
- Check if email already exists in event
- Use `getParticipantByEmail()` to check first

### "Invalid expense splits" error
- Ensure amounts sum to expense amount
- Or percentages sum to 100%
- Use `validateExpenseSplits()` before saving

### "Cannot edit closed event" error
- Use `reopenEvent()` first
- Or check event status before allowing edits

### Settlement calculations wrong
- Ensure custom splits are included in calculation
- Check that all expenses have valid splits
- Verify participant list is correct

---

For more details, see `V2_CHANGELOG.md` and `V2_SUMMARY.md`
