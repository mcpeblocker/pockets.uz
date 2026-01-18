import { createClient } from './supabase-server';

/**
 * Generate or retrieve device ID
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

/**
 * Get device name from user agent
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown Device';
  
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone|iPad/.test(ua)) {
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua)) return 'Android Device';
    return 'Mobile Device';
  }
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux PC';
  return 'Unknown Device';
}

/**
 * Register or update device session
 */
export async function registerDeviceSession(userId: string): Promise<void> {
  const supabase = await createClient();
  const deviceId = getDeviceId();
  const deviceName = getDeviceName();
  const userAgent = typeof window !== 'undefined' ? navigator.userAgent : null;

  // Set expiration to 90 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  await supabase
    .from('device_sessions')
    .upsert({
      user_id: userId,
      device_id: deviceId,
      device_name: deviceName,
      user_agent: userAgent,
      last_active_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'user_id,device_id',
    });
}

/**
 * Update device session last active time
 */
export async function updateDeviceSession(userId: string): Promise<void> {
  const supabase = await createClient();
  const deviceId = getDeviceId();

  await supabase
    .from('device_sessions')
    .update({ last_active_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('device_id', deviceId);
}

/**
 * Get user's active device sessions
 */
export async function getDeviceSessions(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('device_sessions')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('last_active_at', { ascending: false });

  if (error) {
    console.error('Error fetching device sessions:', error);
    return [];
  }

  return data || [];
}

/**
 * Revoke a device session
 */
export async function revokeDeviceSession(
  userId: string,
  sessionId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('device_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);
}
