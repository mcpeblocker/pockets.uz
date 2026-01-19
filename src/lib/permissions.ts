import { createClient } from './supabase-server';
import { Event, Group, PermissionCheck, UserRole } from './types';

/**
 * Check user permissions for an event
 */
export async function checkEventPermissions(
  eventId: string,
  userId: string | null
): Promise<PermissionCheck> {
  if (!userId) {
    // Public user - can only view
    return {
      canView: true,
      canEdit: false,
      canDelete: false,
      canAddExpenses: false,
      canManageMembers: false,
      role: 'public',
    };
  }

  const supabase = await createClient();

  // Get event with group info
  const { data: event } = await supabase
    .from('events')
    .select('*, group:groups(*)')
    .eq('id', eventId)
    .single();

  if (!event) {
    return {
      canView: false,
      canEdit: false,
      canDelete: false,
      canAddExpenses: false,
      canManageMembers: false,
      role: 'public',
    };
  }

  // Check if user is event owner
  if (event.owner_id === userId) {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canAddExpenses: true,
      canManageMembers: true,
      role: 'owner',
    };
  }

  // Check if user is a participant (allow them to add expenses)
  const { data: participant } = await supabase
    .from('participants')
    .select('id, user_id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  if (participant) {
    return {
      canView: true,
      canEdit: false,
      canDelete: false,
      canAddExpenses: true, // Participants can add expenses
      canManageMembers: false,
      role: 'participant',
    };
  }

  // Check if event belongs to a group
  if (event.group_id) {
    const { data: member } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', event.group_id)
      .eq('user_id', userId)
      .single();

    if (member) {
      const isAdmin = member.role === 'admin';
      return {
        canView: true,
        canEdit: isAdmin, // Only admins can edit events
        canDelete: isAdmin, // Only admins can delete events
        canAddExpenses: true, // All members can add expenses
        canManageMembers: isAdmin, // Only admins can manage members
        role: member.role,
      };
    }

    // Check if user is group owner
    const { data: group } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', event.group_id)
      .single();

    if (group?.owner_id === userId) {
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canAddExpenses: true,
        canManageMembers: true,
        role: 'admin',
      };
    }
  }

  // No permissions
  return {
    canView: false,
    canEdit: false,
    canDelete: false,
    canAddExpenses: false,
    canManageMembers: false,
    role: 'public',
  };
}

/**
 * Check if user can edit a specific expense
 */
export async function canEditExpense(
  expenseId: string,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false;

  const supabase = await createClient();

  // Get expense with event info
  const { data: expense } = await supabase
    .from('expenses')
    .select('*, event:events(*)')
    .eq('id', expenseId)
    .single();

  if (!expense || !expense.event) return false;

  const event = expense.event as Event;

  // Event owner can always edit
  if (event.owner_id === userId) return true;

  // If in a group, check group permissions
  if (event.group_id) {
    const { data: member } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', event.group_id)
      .eq('user_id', userId)
      .single();

    if (member) {
      // Admins can edit any expense
      if (member.role === 'admin') return true;
      // Members can only edit their own expenses
      if (expense.created_by === userId) return true;
    }

    // Check if user is group owner
    const { data: group } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', event.group_id)
      .single();

    if (group?.owner_id === userId) return true;
  }

  return false;
}

/**
 * Check if user can delete an expense
 */
export async function canDeleteExpense(
  expenseId: string,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false;

  const supabase = await createClient();

  // Get expense with event info
  const { data: expense } = await supabase
    .from('expenses')
    .select('*, event:events(*)')
    .eq('id', expenseId)
    .single();

  if (!expense || !expense.event) return false;

  const event = expense.event as Event;

  // Event owner can always delete
  if (event.owner_id === userId) return true;

  // If in a group, only admins can delete
  if (event.group_id) {
    const { data: member } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', event.group_id)
      .eq('user_id', userId)
      .single();

    if (member?.role === 'admin') return true;

    // Check if user is group owner
    const { data: group } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', event.group_id)
      .single();

    if (group?.owner_id === userId) return true;
  }

  return false;
}

/**
 * Check if user is group admin
 */
export async function isGroupAdmin(
  groupId: string,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false;

  const supabase = await createClient();

  // Check if user is group owner
  const { data: group } = await supabase
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .single();

  if (group?.owner_id === userId) return true;

  // Check if user is admin member
  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  return member?.role === 'admin';
}

/**
 * Check if user is group member
 */
export async function isGroupMember(
  groupId: string,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false;

  const supabase = await createClient();

  // Check if user is group owner
  const { data: group } = await supabase
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .single();

  if (group?.owner_id === userId) return true;

  // Check if user is a member
  const { data: member } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  return !!member;
}
