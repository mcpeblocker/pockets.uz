import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase-server';
import { ensureUserExists } from '@/lib/user-sync';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Extract Telegram data
    const id = searchParams.get('id');
    const first_name = searchParams.get('first_name');
    const last_name = searchParams.get('last_name');
    const username = searchParams.get('username');
    const photo_url = searchParams.get('photo_url');
    const auth_date = searchParams.get('auth_date');
    const hash = searchParams.get('hash');

    if (!id || !auth_date || !hash) {
      return NextResponse.redirect(new URL('/login?error=invalid_telegram_data', url.origin));
    }

    // Verify the data is from Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return NextResponse.redirect(new URL('/login?error=telegram_not_configured', url.origin));
    }

    // Create data-check-string
    const dataCheckArr: string[] = [];
    searchParams.forEach((value, key) => {
      if (key !== 'hash') {
        dataCheckArr.push(`${key}=${value}`);
      }
    });
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    // Create secret key (SHA256 of bot token)
    const secretKey = crypto.createHash('sha256').update(botToken).digest();

    // Calculate HMAC-SHA256
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    // Verify hash
    if (hmac !== hash) {
      console.error('Invalid Telegram hash');
      return NextResponse.redirect(new URL('/login?error=invalid_telegram_auth', url.origin));
    }

    // Check auth_date is not too old (within 1 day)
    const authTimestamp = parseInt(auth_date);
    const now = Math.floor(Date.now() / 1000);
    if (now - authTimestamp > 86400) {
      return NextResponse.redirect(new URL('/login?error=telegram_auth_expired', url.origin));
    }

    // Auth is valid, create or update user
    const supabase = await createClient();

    // Check if user with this telegram_id exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', id)
      .single();

    const name = [first_name, last_name].filter(Boolean).join(' ');

    if (existingUser) {
      // Update existing user
      await supabase
        .from('users')
        .update({
          name: name || null,
          updated_at: new Date().toISOString(),
        })
        .eq('telegram_id', id);
    } else {
      // Create new user
      await supabase
        .from('users')
        .insert({
          telegram_id: id,
          name: name || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    // Store telegram auth in session/cookie (for linking to Supabase auth later if needed)
    // For now, just redirect to success page
    return NextResponse.redirect(
      new URL(`/login?telegram_auth=success&telegram_id=${id}&username=${username || ''}`, url.origin)
    );
  } catch (error) {
    console.error('Error in Telegram auth callback:', error);
    return NextResponse.redirect(new URL('/login?error=telegram_auth_failed', request.url));
  }
}
