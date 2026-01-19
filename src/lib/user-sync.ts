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

  // Wait a moment for the trigger to potentially create the user
  // The trigger runs asynchronously, so we give it a chance
  // Try multiple times with increasing delays
  for (let attempt = 0; attempt < 3; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
    
    // Check if user was created by trigger
    const { data: triggerUser, error: checkError } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', userId)
      .single();
    
    if (triggerUser) {
      // User was created by trigger, update name if provided
      if (name && triggerUser.name !== name) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ name: name.trim(), updated_at: new Date().toISOString() })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Error updating user name after trigger creation:', updateError);
          // Non-critical, continue
        }
      }
      return { success: true };
    }
    
    // If check error is not "not found", log it
    if (checkError && checkError.code !== 'PGRST116') {
      console.warn(`Error checking user on attempt ${attempt + 1}:`, checkError);
    }
  }

  // Create user if they don't exist (trigger didn't create it)
  console.log('Trigger did not create user, attempting manual insert...');
  const { error, data: insertData } = await supabase
    .from('users')
    .insert({
      id: userId,
      email: email || null,
      name: name || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select();

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
    
    console.error('❌ Error creating user in database:');
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Error hint:', error.hint);
    console.error('   Full error:', JSON.stringify(error, null, 2));
    
    // Check if it's an RLS policy error
    if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('permission') || error.message?.includes('row-level security')) {
      return { 
        error: `Database permission error (code: ${error.code}). The user INSERT policy may not be working correctly. Error: ${error.message}. Please check: 1) Run FIX_USER_POLICY.sql, 2) Verify RLS is enabled, 3) Check the policy allows INSERT with auth.uid() = id`,
        details: error.message,
        code: error.code,
        hint: error.hint
      };
    }
    
    // Return detailed error for debugging - include ALL information
    const errorMsg = `Database error saving new user`;
    const codeMsg = error.code ? ` (Error Code: ${error.code})` : '';
    const messageMsg = error.message ? `\n\nError: ${error.message}` : '';
    const hintMsg = error.hint ? `\n\nHint: ${error.hint}` : '';
    const fullError = `${errorMsg}${codeMsg}${messageMsg}${hintMsg}`;
    
    console.error('📋 Full error details being returned:', {
      error: fullError,
      code: error.code,
      message: error.message,
      hint: error.hint
    });
    
    return { 
      error: fullError,
      details: error.message,
      code: error.code,
      hint: error.hint
    };
  }

  // Success - user was created
  if (insertData && insertData.length > 0) {
    console.log('✅ User created successfully:', insertData[0].id);
  }
  
  return { success: true };
}
