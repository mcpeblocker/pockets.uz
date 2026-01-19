'use server';

import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { registerDeviceSession } from '@/lib/device-session';
import { sendVerificationEmail } from '@/lib/email';

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
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;

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
    console.error('Failed to sync user to database:', syncResult.error);
    console.error('Error details:', syncResult.details);
    console.error('Error code:', syncResult.code);
    
    // Return a user-friendly error message
    if (syncResult.error.includes('permission') || syncResult.error.includes('policy')) {
      return { 
        error: 'Database configuration error. Please ensure the database migration has been run. If the problem persists, contact support.' 
      };
    }
    
    return { 
      error: syncResult.error || 'Database error saving new user. Please try again or contact support if the issue persists.' 
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

  // If email confirmation is required, ensure verification email is sent
  // Supabase should automatically send an email when signUp is called, but we'll:
  // 1. Try to resend via Supabase (in case the first one didn't send)
  // 2. Send our own custom email as a backup/confirmation
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // Resend confirmation email via Supabase (this ensures Supabase's email is sent)
    // This uses Supabase's built-in email service
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });
    
    if (resendError) {
      console.warn('⚠️ Supabase email resend had an issue:', resendError.message);
      console.log('📧 This might be normal if email confirmation is disabled in Supabase settings');
    } else {
      console.log('✅ Supabase verification email sent successfully');
    }
    
    // Also send our custom verification email as a backup/confirmation
    // This ensures the user gets an email even if Supabase's email service isn't configured
    const emailResult = await sendVerificationEmail(
      email.trim().toLowerCase(),
      name || null,
      siteUrl
    );
    
    if (emailResult.success) {
      console.log('✅ Custom verification email sent successfully');
    } else {
      console.error('❌ Failed to send custom verification email:', emailResult.error);
      // Don't fail signup if custom email fails
    }
  } catch (emailError) {
    console.error('❌ Error in email verification process:', emailError);
    // Don't fail signup if email sending fails - Supabase may have sent one
  }

  // Inform the user to check their email
  return { 
    success: true, 
    user: data.user,
    message: 'Account created! Please check your email to confirm your account before signing in. If you don\'t see the email, check your spam folder.' 
  };
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
