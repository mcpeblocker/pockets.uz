import nodemailer from 'nodemailer';

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
  eventTitle: string,
  settlements: Array<{ from: string; to: string; amount: number }>,
  emailNote?: string
) {
  const settlementsHtml = settlements
    .map(s => `<li><strong>${s.from}</strong> pays <strong>${s.to}</strong>: $${s.amount.toFixed(2)}</li>`)
    .join('');

  return sendEmail({
    to: email,
    subject: `Settlement details for ${eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">${eventTitle} - Final Settlement</h1>
        <p>The event has been closed and expenses have been calculated.</p>
        
        ${emailNote ? `<div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Note from organizer:</strong></p>
          <p style="margin: 10px 0 0 0;">${emailNote}</p>
        </div>` : ''}
        
        <h2 style="color: #374151;">Settlement Summary</h2>
        <ul style="line-height: 2;">
          ${settlementsHtml}
        </ul>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          This is an automated message from Pockets.
        </p>
      </div>
    `,
  });
}
