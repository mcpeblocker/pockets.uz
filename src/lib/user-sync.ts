import { createClient } from './supabase-server';

/**
 * Ensures that a user from Supabase Auth exists in the public.users table
 * This is a fallback in case the trigger fails or for existing users
 */
export async function ensureUserExists(userId: string, email?: string, name?: string) {
  const supabase = await createClient();

  // Check if user exists
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id, name')
    .eq('id', userId)
    .single();

  // If user exists, update name if provided and different
  if (existingUser) {
    if (name && existingUser.name !== name) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ name: name.trim(), updated_at: new Date().toISOString() })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error updating user name:', updateError);
        // Non-critical, continue
      }
    }
    return { success: true };
  }

  // If fetch error is not "not found", it's a real error
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error checking user existence:', fetchError);
    return { 
      error: 'Database error checking user. Please try again.',
      details: fetchError.message 
    };
  }

  // Create user if they don't exist
  // The trigger should have created the user, but if it didn't, we'll create it here
  const { error } = await supabase
    .from('users')
    .insert({
      id: userId,
      email: email || null,
      name: name || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    // If user already exists (from trigger), that's fine - check again
    if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
      console.log('User already exists in database (likely created by trigger), verifying...');
      // Verify the user exists now
      const { data: verifyUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (verifyUser) {
        return { success: true };
      }
    }
    
    console.error('Error creating user in database:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Check if it's an RLS policy error
    if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('permission')) {
      return { 
        error: 'Database permission error. The user INSERT policy may not be configured correctly. Please ensure the database migration has been run.',
        details: error.message,
        code: error.code
      };
    }
    
    return { 
      error: 'Database error saving new user',
      details: error.message,
      code: error.code
    };
  }

  return { success: true };
}
