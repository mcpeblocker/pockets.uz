# Pockets V3 - Architecture Refactoring

## Overview
Complete architectural refactoring to support Groups, enhanced authentication, permissions, and sync strategy.

## Core Architecture Decisions

### 1. Groups vs Events
- **Groups**: Long-lived collections of people who frequently split expenses
- **Events**: Individual expense sessions within a group (or standalone)
- Groups can have multiple events over time
- Events can exist without groups (backward compatible)

### 2. User Accounts & Auth
- **Email + Password**: Traditional authentication
- **Magic Links**: Passwordless option (existing)
- **OAuth**: Google, GitHub (future)
- **Device Sessions**: Track active devices per user

### 3. Data Model

#### Groups
- Groups contain multiple members
- Groups can have multiple events
- Groups have settings (currency, default splits, etc.)

#### Group Members
- Role: `admin` | `member`
- Permissions based on role
- Can invite other members

#### Events
- Can belong to a group OR be standalone
- Backward compatible with existing events

#### Expenses
- Belong to events
- Can be added by any group member (if in group) or owner (if standalone)

#### Splits
- Already implemented in V2
- Custom splits per expense

#### Payments (Settlements)
- Already implemented
- Track payment status per participant

### 4. Permissions

#### Admin (Group Owner or Event Owner)
- Can add/edit/delete expenses
- Can add/remove members
- Can close events
- Can modify group settings

#### Member (Group Member)
- Can add expenses
- Can edit own expenses (optional)
- Can view all expenses
- Cannot delete expenses
- Cannot modify group settings

#### Public (Non-authenticated)
- Can view public events (if link shared)
- Can join events
- Cannot add expenses

### 5. Sync & Offline Strategy

#### Server-First Approach
- Primary source of truth is server
- Client syncs on connection
- Last-write-wins conflict resolution

#### Sync Fields
- `version` field for optimistic locking
- `last_synced_at` for tracking sync state
- `device_id` for device-specific tracking

### 6. Audit Basics

#### Standard Fields
- `created_at`: When record was created
- `updated_at`: When record was last modified
- `created_by`: User ID who created (nullable for public actions)
- `updated_by`: User ID who last updated (nullable)

#### Audit Log
- `event_history` table (already exists)
- Track all significant actions
- Include device_id for device tracking

## Migration Strategy

### Phase 1: Add New Tables (Non-Breaking)
1. Create `groups` table
2. Create `group_members` table
3. Add audit fields to existing tables
4. Add device sessions table

### Phase 2: Update Existing Tables
1. Add `group_id` to events (nullable, backward compatible)
2. Add `created_by`, `updated_by` to all tables
3. Add `version` for sync

### Phase 3: Update Permissions
1. Update RLS policies
2. Add permission checks in server actions
3. Update UI to respect permissions

### Phase 4: Auth Enhancement
1. Add password authentication
2. Add device session tracking
3. Update login flow

## Database Schema Changes

### New Tables
- `groups`
- `group_members`
- `device_sessions`
- `auth_providers` (for OAuth)

### Enhanced Tables
- `events` - add `group_id`, `created_by`, `updated_by`, `version`
- `expenses` - add `created_by`, `updated_by`, `version`
- `participants` - add `created_by`, `updated_by`
- All tables - add audit fields

## Implementation Priority

1. **High Priority**
   - Groups and GroupMembers tables
   - Permission system (admin vs member)
   - Audit fields (created_by, updated_by)

2. **Medium Priority**
   - Password authentication
   - Device session tracking
   - Sync version fields

3. **Low Priority**
   - OAuth providers
   - Full offline support
   - Advanced conflict resolution
