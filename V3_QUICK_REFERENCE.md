# V3 Architecture - Quick Reference

## Permission Checking

```typescript
import { checkEventPermissions, canEditExpense, canDeleteExpense } from '@/lib/permissions';

// Check full permissions for an event
const permissions = await checkEventPermissions(eventId, userId);
if (permissions.canAddExpenses) {
  // User can add expenses
}

// Check specific expense permissions
const canEdit = await canEditExpense(expenseId, userId);
const canDelete = await canDeleteExpense(expenseId, userId);
```

## Device Sessions

```typescript
import { registerDeviceSession, updateDeviceSession, getDeviceSessions } from '@/lib/device-session';

// Register device on login
await registerDeviceSession(userId);

// Update on activity
await updateDeviceSession(userId);

// Get user's active devices
const devices = await getDeviceSessions(userId);
```

## Group Management

```typescript
import { createGroup, addGroupMember, updateGroupMemberRole } from '@/app/actions/groups';

// Create group
const formData = new FormData();
formData.append('name', 'Roommates');
formData.append('currency', 'USD');
const result = await createGroup(formData);

// Add member
const memberFormData = new FormData();
memberFormData.append('email', 'member@example.com');
memberFormData.append('role', 'member');
await addGroupMember(groupId, memberFormData);
```

## Authentication

```typescript
import { signInWithPassword, signUpWithPassword } from '@/app/actions/auth';

// Sign in with password
const formData = new FormData();
formData.append('email', 'user@example.com');
formData.append('password', 'password123');
await signInWithPassword(formData);

// Sign up
formData.append('name', 'John Doe');
await signUpWithPassword(formData);
```

## Creating Events in Groups

```typescript
// Create event in a group
const formData = new FormData();
formData.append('title', 'Dinner');
formData.append('slug', 'dinner');
formData.append('groupId', groupId); // V3: Link to group
await createEvent(formData);
```

## Permission-Based UI

```typescript
// In component
const permissions = await checkEventPermissions(eventId, userId);

{permissions.canAddExpenses && (
  <button onClick={handleAddExpense}>Add Expense</button>
)}

{permissions.canEdit && (
  <button onClick={handleEdit}>Edit Event</button>
)}

{permissions.canDelete && (
  <button onClick={handleDelete}>Delete Event</button>
)}
```

## Audit Fields

All inserts/updates automatically set:
- `created_by` - Set on insert (via trigger)
- `updated_by` - Set on update (via trigger)
- `version` - Incremented on update (via trigger)

No need to manually set these fields!

## RLS Policies

- **Groups**: Only members can read
- **Group Members**: Only group members can see membership list
- **Events**: Group members can create/update events in their groups
- **Expenses**: Group members can add, members can edit own, admins can edit any

## Migration Checklist

- [ ] Run `20240102000000_v3_groups_architecture.sql`
- [ ] Verify triggers are working
- [ ] Test group creation
- [ ] Test permissions
- [ ] Update UI components
