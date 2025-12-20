import { formatCurrency } from './currency';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;

export interface SendTelegramMessageOptions {
  chatId: string;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
}

export async function sendTelegramMessage({ chatId, text, parseMode = 'HTML' }: SendTelegramMessageOptions) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('Telegram bot token not configured. Skipping message send.');
    return { success: false, error: 'Telegram not configured' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram API error:', data);
      return { success: false, error: data.description };
    }

    return { success: true, messageId: data.result.message_id };
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return { success: false, error: String(error) };
  }
}

export async function sendSupportMessage(name: string, email: string, message: string) {
  if (!TELEGRAM_ADMIN_ID) {
    console.warn('Telegram admin ID not configured. Cannot send support message.');
    return { success: false, error: 'Admin not configured' };
  }

  const text = `
<b>🆘 New Support Request</b>

<b>From:</b> ${name}
<b>Email:</b> ${email}

<b>Message:</b>
${message}
  `.trim();

  return sendTelegramMessage({
    chatId: TELEGRAM_ADMIN_ID,
    text,
    parseMode: 'HTML',
  });
}

export async function sendEventNotification(eventTitle: string, eventSlug: string) {
  if (!TELEGRAM_ADMIN_ID) {
    return { success: false, error: 'Admin not configured' };
  }

  const eventUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/event/${eventSlug}`;
  const text = `
<b>📊 New Event Created</b>

<b>Title:</b> ${eventTitle}
<b>URL:</b> <a href="${eventUrl}">${eventUrl}</a>
  `.trim();

  return sendTelegramMessage({
    chatId: TELEGRAM_ADMIN_ID,
    text,
    parseMode: 'HTML',
  });
}

export async function sendSettlementNotification(
  telegramUsername: string,
  participantName: string,
  eventTitle: string,
  currency: string,
  settlementsForParticipant: {
    toPay: Array<{ to: string; amount: number }>;
    toReceive: Array<{ from: string; amount: number }>;
  },
  emailNote?: string
) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('Telegram bot token not configured.');
    return { success: false, error: 'Telegram not configured' };
  }

  // Try to send to username (without @ prefix if they included it)
  const username = telegramUsername.startsWith('@') ? telegramUsername.substring(1) : telegramUsername;
  
  const hasSettlements = settlementsForParticipant.toPay.length > 0 || settlementsForParticipant.toReceive.length > 0;

  let text = `<b>💰 ${eventTitle} - Settlement</b>\n\nHi ${participantName}!\n\nThe event has been closed.\n\n`;

  if (emailNote) {
    text += `<b>Organizer note:</b>\n${emailNote}\n\n`;
  }

  if (settlementsForParticipant.toPay.length > 0) {
    text += '<b>You need to pay:</b>\n';
    settlementsForParticipant.toPay.forEach(s => {
      text += `• Pay ${s.to}: ${formatCurrency(s.amount, currency)}\n`;
    });
    text += '\n';
  }

  if (settlementsForParticipant.toReceive.length > 0) {
    text += '<b>You will receive:</b>\n';
    settlementsForParticipant.toReceive.forEach(s => {
      text += `• ${s.from} will pay you: ${formatCurrency(s.amount, currency)}\n`;
    });
    text += '\n';
  }

  if (!hasSettlements) {
    text += '✅ <b>No action required!</b>\nYour expenses are already settled.';
  }

  // Note: We can't directly message users by username without them starting a conversation first
  // This is a limitation of Telegram Bot API. For now, we'll try sending to @username
  // In production, you might want to direct users to start the bot first
  try {
    return await sendTelegramMessage({
      chatId: `@${username}`,
      text,
      parseMode: 'HTML',
    });
  } catch (error) {
    // If direct username messaging fails, log it but don't throw
    console.log(`Could not send Telegram message to @${username}. User may need to start the bot first.`);
    return { success: false, error: 'User needs to start bot first' };
  }
}
