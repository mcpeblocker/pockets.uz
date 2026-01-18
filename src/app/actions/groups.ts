'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { ensureUserExists } from '@/lib/user-sync';

/**
 * Create a new group
 */
export async function createGroup(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be signed in to create groups' };
  }

  // Ensure user exists in the database
  const syncResult = await ensureUserExists(user.id, user.email);
  if (syncResult.error) {
    return { error: 'Failed to sync user account. Please try again.' };
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const currency = (formData.get('currency') as string) || 'USD';

  if (!name) {
    return { error: 'Group name is required' };
  }

  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      name,
      description: description || null,
      currency,
      owner_id: user.id,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating group:', error);
    return { error: 'Failed to create group' };
  }

  revalidatePath('/dashboard');
  return { success: true, group };
}

/**
 * Get user's groups
 */
export async function getUserGroups() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get groups where user is owner or member
  const { data: groups, error } = await supabase
    .from('groups')
    .select(`
      *,
      members:group_members(count),
      my_membership:group_members!inner(role)
    `)
    .or(`owner_id.eq.${user.id},group_members.user_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching groups:', error);
    return [];
  }

  return groups || [];
}

/**
 * Get group by ID with members
 */
export async function getGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: group, error } = await supabase
    .from('groups')
    .select(`
      *,
      members:group_members(
        *,
        user:users(id, email, name)
      )
    `)
    .eq('id', groupId)
    .single();

  if (error || !group) {
    return null;
  }

  // Verify user has access
  if (group.owner_id !== user.id) {
    const { data: member } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return null; // User doesn't have access
    }
  }

  return group;
}

/**
 * Add member to group
 */
export async function addGroupMember(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Check if user is admin or owner
  const { data: group } = await supabase
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .single();

  if (!group) {
    return { error: 'Group not found' };
  }

  const isOwner = group.owner_id === user.id;
  if (!isOwner) {
    const { data: member } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (member?.role !== 'admin') {
      return { error: 'Only admins can add members' };
    }
  }

  const email = formData.get('email') as string;
  const role = (formData.get('role') as 'admin' | 'member') || 'member';

  if (!email) {
    return { error: 'Email is required' };
  }

  // Find user by email
  const { data: targetUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (!targetUser) {
    return { error: 'User not found. They need to sign up first.' };
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', targetUser.id)
    .single();

  if (existing) {
    return { error: 'User is already a member of this group' };
  }

  // Add member
  const { error } = await supabase.from('group_members').insert({
    group_id: groupId,
    user_id: targetUser.id,
    role,
    invited_by: user.id,
  });

  if (error) {
    console.error('Error adding group member:', error);
    return { error: 'Failed to add member' };
  }

  revalidatePath(`/dashboard/group/${groupId}`);
  return { success: true };
}

/**
 * Update group member role
 */
export async function updateGroupMemberRole(
  groupId: string,
  memberId: string,
  role: 'admin' | 'member'
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Check if user is owner or admin
  const { data: group } = await supabase
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .single();

  if (!group) {
    return { error: 'Group not found' };
  }

  const isOwner = group.owner_id === user.id;
  if (!isOwner) {
    const { data: member } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (member?.role !== 'admin') {
      return { error: 'Only admins can update member roles' };
    }
  }

  // Don't allow changing owner's role
  if (group.owner_id === memberId) {
    return { error: 'Cannot change owner role' };
  }

  const { error } = await supabase
    .from('group_members')
    .update({ role })
    .eq('id', memberId)
    .eq('group_id', groupId);

  if (error) {
    console.error('Error updating member role:', error);
    return { error: 'Failed to update member role' };
  }

  revalidatePath(`/dashboard/group/${groupId}`);
  return { success: true };
}

/**
 * Remove member from group
 */
export async function removeGroupMember(groupId: string, memberId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Check if user is owner or admin
  const { data: group } = await supabase
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .single();

  if (!group) {
    return { error: 'Group not found' };
  }

  const isOwner = group.owner_id === user.id;
  if (!isOwner) {
    const { data: member } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (member?.role !== 'admin') {
      return { error: 'Only admins can remove members' };
    }
  }

  // Don't allow removing owner
  if (group.owner_id === memberId) {
    return { error: 'Cannot remove group owner' };
  }

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('id', memberId)
    .eq('group_id', groupId);

  if (error) {
    console.error('Error removing member:', error);
    return { error: 'Failed to remove member' };
  }

  revalidatePath(`/dashboard/group/${groupId}`);
  return { success: true };
}

/**
 * Update group settings
 */
export async function updateGroup(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Check if user is owner or admin
  const { data: group } = await supabase
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .single();

  if (!group) {
    return { error: 'Group not found' };
  }

  const isOwner = group.owner_id === user.id;
  if (!isOwner) {
    const { data: member } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (member?.role !== 'admin') {
      return { error: 'Only admins can update group settings' };
    }
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const currency = formData.get('currency') as string;

  const updateData: any = {
    updated_by: user.id,
  };

  if (name) updateData.name = name;
  if (description !== null) updateData.description = description || null;
  if (currency) updateData.currency = currency;

  const { error } = await supabase
    .from('groups')
    .update(updateData)
    .eq('id', groupId);

  if (error) {
    console.error('Error updating group:', error);
    return { error: 'Failed to update group' };
  }

  revalidatePath(`/dashboard/group/${groupId}`);
  return { success: true };
}

/**
 * Delete group
 */
export async function deleteGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Only owner can delete
  const { data: group } = await supabase
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .single();

  if (!group) {
    return { error: 'Group not found' };
  }

  if (group.owner_id !== user.id) {
    return { error: 'Only group owner can delete the group' };
  }

  const { error } = await supabase.from('groups').delete().eq('id', groupId);

  if (error) {
    console.error('Error deleting group:', error);
    return { error: 'Failed to delete group' };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
