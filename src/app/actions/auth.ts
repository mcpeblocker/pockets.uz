'use server';

import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { registerDeviceSession } from '@/lib/device-session';

/**
 * Sign in with email and password
 */
export async function signInWithPassword(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    // Provide more helpful error messages
    if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
      return { error: 'Invalid email or password. If you signed up with a magic link, please use "Sign In" with magic link instead, or reset your password.' };
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Please check your email and confirm your account before signing in.' };
    }
    return { error: error.message };
  }

  // Register device session
  if (data.user) {
    await registerDeviceSession(data.user.id);
  }

  return { success: true, user: data.user };
}

/**
 * Sign up with email and password
 */
export async function signUpWithPassword(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    console.log('🔐 Starting signup for:', email);

    if (!email || !password) {
      return { error: 'Email and password are required' };
    }

    if (password.length < 8) {
      return { error: 'Password must be at least 8 characters' };
    }

    const supabase = await createClient();

  // Sign up the user
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        name: name || null,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    console.error('Signup error:', error);
    // Provide more helpful error messages
    if (error.message.includes('User already registered')) {
      return { error: 'An account with this email already exists. Please sign in instead, or use "Forgot Password" if you don\'t remember your password.' };
    }
    return { error: error.message };
  }

  if (!data.user) {
    console.error('No user returned from signup');
    return { error: 'Failed to create account. Please try again.' };
  }

  // Ensure user exists in public.users table (trigger should handle this, but we'll ensure it)
  // Pass the name here so it can be set during creation
  const { ensureUserExists } = await import('@/lib/user-sync');
  const syncResult = await ensureUserExists(
    data.user.id, 
    data.user.email || email.trim().toLowerCase(),
    name || undefined
  );
  
  if (syncResult.error) {
    console.error('❌ Failed to sync user to database:');
    console.error('   Error:', syncResult.error);
    console.error('   Details:', syncResult.details);
    console.error('   Code:', syncResult.code);
    console.error('   Hint:', syncResult.hint);
    
    // Return the detailed error message - include all available info
    const errorMessage = syncResult.error || 'Database error saving new user';
    const detailsMessage = syncResult.details ? ` Details: ${syncResult.details}` : '';
    const codeMessage = syncResult.code ? ` (Code: ${syncResult.code})` : '';
    const hintMessage = syncResult.hint ? ` Hint: ${syncResult.hint}` : '';
    
    return { 
      error: `${errorMessage}${codeMessage}${detailsMessage}${hintMessage}` 
    };
  }

  // Register device session if user is created and confirmed
  if (data.session) {
    await registerDeviceSession(data.user.id);
    return { 
      success: true, 
      user: data.user,
      message: 'Account created successfully! Redirecting...'
    };
  }

  // Supabase automatically sends verification email when signUp is called
  // No need to send custom email - Supabase handles it

    // Inform the user to check their email
    return { 
      success: true, 
      user: data.user,
      message: 'Account created! Please check your email to confirm your account before signing in. If you don\'t see the email, check your spam folder.' 
    };
  } catch (error) {
    console.error('❌ Unexpected error in signUpWithPassword:', error);
    return { 
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Sign in with magic link (existing functionality)
 */
export async function signInWithEmail(formData: FormData) {
  const email = formData.get('email') as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

/**
 * Get current user
 */
export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Update user password
 */
export async function updatePassword(formData: FormData) {
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!currentPassword || !newPassword) {
    return { error: 'Current and new passwords are required' };
  }

  if (newPassword.length < 8) {
    return { error: 'New password must be at least 8 characters' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Verify current password by attempting to sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (signInError) {
    return { error: 'Current password is incorrect' };
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: updateError.message };
  }

  return { success: true };
}

/**
 * Request password reset
 */
export async function requestPasswordReset(formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email is required' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
