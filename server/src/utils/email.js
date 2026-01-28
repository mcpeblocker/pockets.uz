import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Ensure environment variables are loaded even when this module is imported
// directly (for example in tests or background scripts), and regardless of
// import order in ESM.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1) Load server/.env if present
dotenv.config({ path: join(__dirname, '../../.env') });
// 2) Also load project root .env so you can keep a single env file at repo root
dotenv.config({ path: join(__dirname, '../../../.env') });

// Create transporter lazily so we can log config issues clearly
function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn(
      '[email] EMAIL_USER or EMAIL_PASS is not set. Emails will not be sent. ' +
        'Check your .env configuration in the project root or server/.env.'
    );
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user,
      pass,
    },
  });
}

const transporter = createTransporter();

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
const BRAND_COLOR = '#2563eb';
const TEXT_COLOR = '#111827';
const MUTED_TEXT = '#6b7280';
const BORDER_COLOR = '#e5e7eb';
const BG_COLOR = '#f9fafb';

function wrapInLayout(title, bodyHtml, footerNote = 'This is an automated message from Pockets. Please do not reply to this email.') {
  return `
  <div style="margin:0;padding:0;background:${BG_COLOR};">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding:24px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:16px;border:1px solid ${BORDER_COLOR};overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.1);">
            <tr>
              <td style="padding:20px 24px 12px 24px;border-bottom:1px solid ${BORDER_COLOR};background:linear-gradient(135deg,#0f172a,#020617);">
                <table role="presentation" width="100%">
                  <tr>
                    <td valign="middle">
                      <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:rgba(15,23,42,0.7);border:1px solid rgba(148,163,184,0.5);">
                        <span style="color:#e5e7eb;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">POCKETS</span>
                      </div>
                      <h1 style="margin:12px 0 0 0;font-size:22px;line-height:1.3;color:#f9fafb;">${title}</h1>
                    </td>
                    <td valign="middle" align="right" style="font-size:12px;color:#9ca3af;">
                      <span style="display:inline-block;padding:4px 10px;border-radius:999px;border:1px solid rgba(148,163,184,0.5);background:rgba(15,23,42,0.8);color:#e5e7eb;">
                        Shared expenses, simplified
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 8px 24px;color:${TEXT_COLOR};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.7;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 20px 24px;">
                <p style="margin:16px 0 4px 0;color:${MUTED_TEXT};font-size:12px;">${footerNote}</p>
                <p style="margin:0;color:#9ca3af;font-size:11px;">Pockets · Shared expense tracking made simple.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  `;
}

export async function sendVerificationEmail(email, token) {
  if (!transporter) return; // fail silently if email not configured
  const verificationUrl = `${SITE_URL}/auth/verify?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Verify your Pockets account',
    html: wrapInLayout(
      'Verify your Pockets account',
      `
        <p style="margin:0 0 12px 0;">Hi there,</p>
        <p style="margin:0 0 16px 0;">Thank you for signing up for <strong>Pockets</strong>! Please verify your email address to activate your account and start tracking shared expenses.</p>

        <div style="margin:22px 0;text-align:center;">
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 26px;border-radius:999px;background:${BRAND_COLOR};color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;box-shadow:0 10px 25px rgba(37,99,235,0.35);">
            Verify Email
          </a>
        </div>

        <p style="margin:0 0 8px 0;font-size:13px;color:${MUTED_TEXT};">If the button doesn’t work, copy and paste this link into your browser:</p>
        <p style="margin:0 0 18px 0;font-size:12px;color:${BRAND_COLOR};word-break:break-all;">
          ${verificationUrl}
        </p>

        <p style="margin:0 0 6px 0;font-size:12px;color:${MUTED_TEXT};">This link will expire in <strong>24 hours</strong>.</p>
      `
    ),
  });
}

export async function sendPasswordResetEmail(email, token) {
  if (!transporter) return;
  const resetUrl = `${SITE_URL}/auth/reset-password?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Reset your Pockets password',
    html: wrapInLayout(
      'Reset your password',
      `
        <p style="margin:0 0 12px 0;">We received a request to reset the password for your <strong>Pockets</strong> account.</p>
        <p style="margin:0 0 16px 0;">If you made this request, click the button below to choose a new password.</p>

        <div style="margin:22px 0;text-align:center;">
          <a href="${resetUrl}" style="display:inline-block;padding:12px 26px;border-radius:999px;background:${BRAND_COLOR};color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;box-shadow:0 10px 25px rgba(37,99,235,0.35);">
            Reset Password
          </a>
        </div>

        <p style="margin:0 0 8px 0;font-size:13px;color:${MUTED_TEXT};">If the button doesn’t work, copy and paste this link into your browser:</p>
        <p style="margin:0 0 18px 0;font-size:12px;color:${BRAND_COLOR};word-break:break-all;">
          ${resetUrl}
        </p>

        <p style="margin:0 0 6px 0;font-size:12px;color:${MUTED_TEXT};">This link will expire in <strong>1 hour</strong>.</p>
        <p style="margin:0;font-size:12px;color:${MUTED_TEXT};">If you didn’t request a password reset, you can safely ignore this email.</p>
      `
    ),
  });
}

export async function sendSettlementEmail(email, eventTitle, settlements, currency, emailNote) {
  if (!transporter) return;
  let listHtml = '';

  settlements.forEach(settlement => {
    listHtml += `
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:${TEXT_COLOR};border-bottom:1px solid ${BORDER_COLOR};">
          <strong>${settlement.from_name}</strong>
        </td>
        <td style="padding:8px 12px;font-size:13px;color:${TEXT_COLOR};border-bottom:1px solid ${BORDER_COLOR};">
          pays
        </td>
        <td style="padding:8px 12px;font-size:13px;color:${TEXT_COLOR};border-bottom:1px solid ${BORDER_COLOR};">
          <strong>${settlement.to_name}</strong>
        </td>
        <td style="padding:8px 12px;font-size:13px;color:${BRAND_COLOR};font-weight:600;border-bottom:1px solid ${BORDER_COLOR};text-align:right;">
          ${formatCurrency(settlement.amount, currency)}
        </td>
      </tr>
    `;
  });

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">The event <strong>${eventTitle}</strong> has been closed. Here is the summary of who should pay whom to settle all expenses:</p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0 8px 0;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid ${BORDER_COLOR};">
      <thead>
        <tr style="background:#f3f4f6;">
          <th align="left" style="padding:8px 12px;font-size:12px;color:${MUTED_TEXT};font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">From</th>
          <th></th>
          <th align="left" style="padding:8px 12px;font-size:12px;color:${MUTED_TEXT};font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">To</th>
          <th align="right" style="padding:8px 12px;font-size:12px;color:${MUTED_TEXT};font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${listHtml || `
          <tr>
            <td colspan="4" style="padding:16px 12px;font-size:13px;color:${MUTED_TEXT};text-align:center;">
              Everyone is already settled. 🎉
            </td>
          </tr>
        `}
      </tbody>
    </table>

    ${emailNote ? `
      <div style="margin:18px 0;padding:14px 14px 12px 14px;border-radius:10px;background:#f3f4f6;border-left:4px solid ${BRAND_COLOR};">
        <p style="margin:0 0 4px 0;font-size:13px;color:${TEXT_COLOR};font-weight:600;">Note from the organizer</p>
        <p style="margin:0;font-size:13px;color:${MUTED_TEXT};">${emailNote}</p>
      </div>
    ` : ''}

    <p style="margin:16px 0 0 0;font-size:13px;color:${MUTED_TEXT};">
      Tip: Once payments are made, you can mark them as paid in Pockets so everyone stays on the same page.
    </p>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: `Settlement Summary: ${eventTitle}`,
    html: wrapInLayout(`Settlement summary for "${eventTitle}"`, bodyHtml),
  });
}

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}
