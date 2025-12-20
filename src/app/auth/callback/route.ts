import { createClient } from '@/lib/supabase-server';
import { ensureUserExists } from '@/lib/user-sync';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    
    // Ensure user exists in public.users table
    if (data?.user) {
      await ensureUserExists(data.user.id, data.user.email);
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin);
}
