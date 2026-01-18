'use server';

import { sendSupportMessage } from '@/lib/telegram';

export async function submitSupport(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const message = formData.get('message') as string;

  if (!name || !email || !message) {
    return { error: 'All fields are required' };
  }

  const result = await sendSupportMessage(name, email, message);

  if (result.error) {
    return { error: 'Failed to send message. Please try again later.' };
  }

  return { success: true };
}
