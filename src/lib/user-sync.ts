import { createClient } from './supabase-server';

/**
 * Ensures that a user from Supabase Auth exists in the public.users table
 * This is a fallback in case the trigger fails or for existing users
 */
export async function ensureUserExists(userId: string, email?: string) {
  const supabase = await createClient();

  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (existingUser) {
    return { success: true };
  }

  // Create user if they don't exist
  const { error } = await supabase
    .from('users')
    .insert({
      id: userId,
      email: email || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error creating user in database:', error);
    // Check if it's an RLS policy error
    if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('permission')) {
      return { 
        error: 'Permission denied. Please ensure the database migration for user INSERT policy has been run.',
        details: error.message 
      };
    }
    return { 
      error: 'Failed to sync user',
      details: error.message 
    };
  }

  return { success: true };
}
