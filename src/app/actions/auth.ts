/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/backend-api";

/**
 * Sign in with email and password
 */
export async function signInWithPassword(formData: FormData) {
  const email = (formData.get("email") as string) || "";
  const password = (formData.get("password") as string) || "";

  if (!email || !password) return { error: "Email and password are required" };

  const { data, error } = await apiFetch<{ token: string; user: any }>(
    "/api/auth/signin",
    {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    }
  );

  if (error || !data?.token) return { error: error || "Failed to sign in" };

  const cookieStore = await cookies();
  cookieStore.set("pockets_token", data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return { success: true, user: data.user };
}

/**
 * Sign up with email and password
 */
export async function signUpWithPassword(formData: FormData) {
  const email = (formData.get("email") as string) || "";
  const password = (formData.get("password") as string) || "";
  const name = (formData.get("name") as string) || "";

  if (!email || !password) return { error: "Email and password are required" };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };

  const { data, error } = await apiFetch<{ user: any; message?: string }>(
    "/api/auth/signup",
    {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, name: name || null }),
    }
  );

  if (error) return { error };

  // Do NOT log the user in yet – they must verify their email first.
  return {
    success: true,
    user: data?.user,
    message: data?.message || "Account created! Please verify your email before signing in.",
  };
}

/**
 * Sign in with magic link (existing functionality)
 */
export async function signInWithEmail() {
  return { error: "Magic link sign-in has been removed. Please use email + password." };
}

/**
 * Sign out
 */
export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("pockets_token");
  redirect('/');
}

/**
 * Get current user
 */
export async function getUser() {
  const { data, error } = await apiFetch<any>("/api/auth/me", { auth: true });
  if (error) return null;
  return data;
}

/**
 * Update user password
 */
export async function updatePassword(formData: FormData) {
  const newPassword = (formData.get("newPassword") as string) || "";
  if (!newPassword) return { error: "New password is required" };
  if (newPassword.length < 8) return { error: "New password must be at least 8 characters" };
  // For now, use reset flow in backend (current-password change UI not wired).
  return { error: "Password update is not available yet. Please use 'Forgot password'." };
}

/**
 * Request password reset
 */
export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get("email") as string) || "";
  if (!email) return { error: "Email is required" };

  const { error } = await apiFetch<{ success: boolean; message: string }>(
    "/api/auth/forgot-password",
    { method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase() }) }
  );
  if (error) return { error };
  return { success: true };
}
