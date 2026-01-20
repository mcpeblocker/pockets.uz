# UX/Logic Bugs Analysis

## ✅ ALL BUGS FIXED

All bugs listed below have been resolved. See commit history for implementation details.

## Critical Bugs

### 1. **Expense Without Splits - Balance Calculation Bug** 🔴 ✅ FIXED
**Location**: `src/lib/settlements.ts` (lines 65-72), `src/app/actions/dashboard.ts` (lines 321-378)

**Issue**: When an expense is created with `splitType === "none"` (split disabled), no splits are created. However, the balance calculation logic falls back to equal split among ALL participants if no splits exist. This means:
- A personal expense (not meant to be split) will still be split equally among everyone
- The payer will show as having paid the full amount, but everyone will owe an equal share
- This creates incorrect balance calculations

**Expected Behavior**: If an expense has no splits, it should be treated as a personal expense - only the payer is involved, no one owes anything.

**Fix**: When `splitType === "none"`, create a split record with only the payer, or update balance calculation to skip expenses without splits.

---

### 2. **Leave Event - Missing Split Check** 🔴 ✅ FIXED
**Location**: `src/app/api/leave-event/route.ts` (lines 31-43)

**Issue**: The leave event API only checks if the participant has paid for expenses (`paid_by_participant_id`), but doesn't check if they're included in expense splits. A participant could:
- Owe money (be in expense splits)
- Still leave the event
- This breaks the balance calculations for remaining participants

**Expected Behavior**: Participants should not be able to leave if they:
- Have paid for expenses, OR
- Are included in any expense splits (owe money)

**Fix**: Add check for expense splits before allowing participant to leave.

---

### 3. **Update Expense - Split Handling Bug** 🟡 ✅ FIXED
**Location**: `src/app/actions/dashboard.ts` (lines 505-540)

**Issue**: When updating an expense:
- All splits are deleted (line 506)
- New splits are only created if `splitType === "custom"` (line 508)
- If `splitType === "equal"` or `splitType === "none"`, no splits are recreated
- This leaves the expense without splits, causing balance calculation issues

**Expected Behavior**: When updating an expense, splits should be properly recreated based on the split type.

**Fix**: Handle all split types (equal, custom, none) when updating expenses.

---

## Medium Priority Bugs

### 4. **Participant Deletion Inconsistency** 🟡 ✅ FIXED
**Location**: `src/app/actions/dashboard.ts` (lines 798-875), `src/app/api/leave-event/route.ts` (lines 31-43)

**Issue**: Two different functions check different conditions:
- `deleteParticipant`: Checks both expenses as payer AND expense splits
- `leave-event` API: Only checks expenses as payer

**Expected Behavior**: Both should check the same conditions for consistency.

**Fix**: Make `leave-event` API check expense splits as well.

---

### 5. **Balance Calculation Fallback Logic** 🟡 ✅ FIXED
**Location**: `src/lib/settlements.ts` (lines 65-72)

**Issue**: If an expense has no splits, the code assumes equal split among ALL participants. This is problematic because:
- It doesn't distinguish between "no splits" (personal expense) and "equal split intended"
- It can create incorrect balances

**Expected Behavior**: Only use equal split fallback if it was explicitly intended, not for expenses without splits.

**Fix**: Track whether an expense was meant to be split or not, or create a split record even for "none" type.

---

### 6. **Custom Split Data Format Mismatch** 🟡 ✅ VERIFIED (Working Correctly)
**Location**: `src/app/dashboard/event/[id]/EventManagementClient.tsx` (line 190-203), `src/app/actions/dashboard.ts` (line 359)

**Issue**: 
- Client sends: `{ participantId: pid, amount: ... }`
- Server expects: `split.participantId` (line 359)

**Status**: This appears to work, but the naming is inconsistent. Should verify it's working correctly.

---

## Low Priority / UX Issues

### 7. **Currency Not Reverted on Expense Deletion** 🟢 ✅ FIXED
**Location**: `src/app/actions/dashboard.ts` (lines 380-415)

**Issue**: When all expenses are deleted, the event currency stays as the last dominant currency. It doesn't revert to a default.

**Expected Behavior**: If all expenses are deleted, currency could revert to USD or stay as-is (depending on UX preference).

**Fix**: Optional - add logic to revert currency when all expenses are deleted.

---

### 8. **No Validation for Empty Participant List** 🟢 ✅ FIXED
**Location**: `src/app/actions/dashboard.ts` (line 322)

**Issue**: When creating an expense with equal split, if `splitParticipants` is empty, the code will try to divide by zero or create no splits.

**Status**: Client-side validation exists (line 177-180), but server-side should also validate.

**Fix**: Add server-side validation.

---

### 9. **Expense Update Doesn't Handle Equal Split** 🟢 ✅ FIXED
**Location**: `src/app/actions/dashboard.ts` (lines 505-540)

**Issue**: When updating an expense, if `splitType === "equal"`, the code doesn't recreate splits. It only handles custom splits.

**Fix**: Add handling for equal split type in update function.

---

### 10. **Missing Error Handling for Photo Upload Failures** 🟢 ✅ FIXED
**Location**: `src/app/dashboard/event/[id]/EventManagementClient.tsx` (lines 223-244)

**Issue**: If photo upload fails after expense creation, the expense is still created but without photos. No user feedback about failed uploads.

**Expected Behavior**: Show user which photos failed to upload, or prevent expense creation if critical photos fail.

---

## Summary

**Critical (Must Fix)**:
1. Expense without splits balance calculation bug
2. Leave event missing split check
3. Update expense split handling

**Medium Priority**:
4. Participant deletion inconsistency
5. Balance calculation fallback logic
6. Custom split data format verification

**Low Priority**:
7. Currency revert on deletion
8. Empty participant list validation
9. Expense update equal split handling
10. Photo upload error handling
