import nodemailer from 'nodemailer';
import { formatCurrency } from './currency';

// Configure the email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const fromEmail = process.env.EMAIL_FROM || 'mcpeblockeruzs@gmail.com';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials not configured. Skipping email send.');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: String(error) };
  }
}

export async function sendEventInvitation(email: string, eventSlug: string, eventTitle: string) {
  const eventUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/event/${eventSlug}`;
  
  return sendEmail({
    to: email,
    subject: `You've been invited to ${eventTitle} on Pockets`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Join ${eventTitle} on Pockets</h1>
        <p>You've been invited to participate in a shared expense event.</p>
        <p>Click the link below to view the event and add your expenses:</p>
        <p style="margin: 30px 0;">
          <a href="${eventUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            View Event
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Event URL: <a href="${eventUrl}">${eventUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          This is an automated message from Pockets. You're receiving this because someone added your email to a shared expense event.
        </p>
      </div>
    `,
  });
}

export async function sendSettlementEmail(
  email: string,
  participantName: string,
  eventTitle: string,
  currency: string,
  settlementsForParticipant: {
    toPay: Array<{ to: string; amount: number }>;
    toReceive: Array<{ from: string; amount: number }>;
  },
  emailNote?: string
) {
  const hasSettlements = settlementsForParticipant.toPay.length > 0 || settlementsForParticipant.toReceive.length > 0;

  let settlementsHtml = '';
  if (settlementsForParticipant.toPay.length > 0) {
    settlementsHtml += '<h3 style="color: #374151; margin-top: 20px;">You need to pay:</h3><ul style="line-height: 2;">';
    settlementsHtml += settlementsForParticipant.toPay
      .map(s => `<li>Pay <strong>${s.to}</strong>: ${formatCurrency(s.amount, currency)}</li>`)
      .join('');
    settlementsHtml += '</ul>';
  }

  if (settlementsForParticipant.toReceive.length > 0) {
    settlementsHtml += '<h3 style="color: #374151; margin-top: 20px;">You will receive:</h3><ul style="line-height: 2;">';
    settlementsHtml += settlementsForParticipant.toReceive
      .map(s => `<li><strong>${s.from}</strong> will pay you: ${formatCurrency(s.amount, currency)}</li>`)
      .join('');
    settlementsHtml += '</ul>';
  }

  if (!hasSettlements) {
    settlementsHtml = `
      <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
        <p style="margin: 0; color: #166534; font-weight: 600;">✅ No action required from you</p>
        <p style="margin: 10px 0 0 0; color: #15803d;">
          Your expenses are already settled! You don't owe anyone and no one owes you.
        </p>
      </div>
    `;
  }

  return sendEmail({
    to: email,
    subject: `Settlement details for ${eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">${eventTitle} - Final Settlement</h1>
        <p>Hi ${participantName},</p>
        <p>The event has been closed and expenses have been calculated.</p>
        
        ${emailNote ? `<div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Note from organizer:</strong></p>
          <p style="margin: 10px 0 0 0;">${emailNote}</p>
        </div>` : ''}
        
        ${settlementsHtml}
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          This is an automated message from Pockets.
        </p>
      </div>
    `,
  });
}
