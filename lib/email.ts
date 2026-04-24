/**
 * Resend Email Integration
 *
 * Replaces Africa's Talking SMS for OTP delivery and notifications.
 * Uses Resend transactional email service.
 *
 * Key design decisions:
 * - Simulation mode: if RESEND_API_KEY is missing, logs to console + DB only
 * - All emails logged to EmailLog table for audit trail
 * - tryEmailSend: non-throwing wrapper for non-critical emails
 * - Branded HTML templates with inline styles for email client compatibility
 */

import { Resend } from 'resend';
import prisma from './prisma';

// ── Environment ─────────────────────────────────────────────────────────────────

const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
const FROM_ADDRESS = process.env.RESEND_FROM || 'IEC_GTSS_SUPPORT <support@gtss.software>';
const IS_SIMULATION = !RESEND_API_KEY;

const resend = IS_SIMULATION ? null : new Resend(RESEND_API_KEY);

if (IS_SIMULATION) {
  console.warn(
    '\n⚠️  [EMAIL] Running in SIMULATION mode — no real emails will be sent.\n' +
    '   RESEND_API_KEY is missing.\n' +
    '   Set RESEND_API_KEY for production email delivery.\n'
  );
}

// ── Brand Colors ────────────────────────────────────────────────────────────────

const BRAND = {
  primary: '#a32a29',     // Equity Maroon
  accent: '#00ab55',      // Moi Green
  bgDark: '#0a0e1a',
  bgCard: '#0f1629',
  bgLight: '#f8fafc',
  textDark: '#1e293b',
  textMuted: '#64748b',
  borderLight: '#e2e8f0',
  white: '#ffffff',
};

// ── HTML Email Templates ────────────────────────────────────────────────────────

function baseTemplate(content: string, preheader: string = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ELP Moi Chapter</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgLight};font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bgLight};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${BRAND.white};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.primary},#6a1717);padding:32px 32px 24px;text-align:center;">
              <div style="font-size:24px;font-weight:800;color:${BRAND.white};letter-spacing:-0.5px;">ELP Moi Chapter</div>
              <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;margin-top:6px;">Independent Electoral Commission</div>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#f1f5f9;border-top:1px solid ${BRAND.borderLight};text-align:center;">
              <p style="margin:0;font-size:12px;color:${BRAND.textMuted};line-height:1.6;">
                This is an automated message from the ELP Moi Chapter IEC.<br>
                Do not reply to this email. For support, contact the IEC directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function otpCodeBlock(code: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <div style="display:inline-block;background:linear-gradient(135deg,${BRAND.bgDark},${BRAND.bgCard});border-radius:12px;padding:20px 40px;">
      <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:${BRAND.white};font-family:'Courier New',monospace;">${code}</span>
    </div>
  </div>`;
}

/** OTP email for vote-day authentication */
export function templateVoteOTP(code: string): { subject: string; html: string } {
  return {
    subject: `Your ELP Moi Chapter Voting Code — ${code}`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${BRAND.textDark};">Your Voting Verification Code</h2>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.6;">
        Use the code below to authenticate your voting session. This code is single-use and time-sensitive.
      </p>
      ${otpCodeBlock(code)}
      <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:24px 0;">
        <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">⏱ This code expires in 5 minutes.</p>
        <p style="margin:4px 0 0;font-size:13px;color:#991b1b;">🔒 Do not share this code with anyone.</p>
      </div>
    `, `Your voting OTP is ${code}. Valid for 5 minutes.`),
  };
}

/** OTP email for Phase A email verification */
export function templateEmailVerification(code: string): { subject: string; html: string } {
  return {
    subject: `Verify Your Email — ELP Moi Chapter Elections`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${BRAND.textDark};">Verify Your Email Address</h2>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.6;">
        You requested to link this email address to your ELP voter account. Enter the code below to confirm ownership.
      </p>
      ${otpCodeBlock(code)}
      <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:24px 0;">
        <p style="margin:0;font-size:13px;color:#166534;font-weight:600;">⏱ This code expires in 10 minutes.</p>
        <p style="margin:4px 0 0;font-size:13px;color:#166534;">Once verified, your OTPs on election day will be sent to this email.</p>
      </div>
      <p style="margin:24px 0 0;font-size:13px;color:${BRAND.textMuted};">
        If you did not request this, you can safely ignore this email.
      </p>
    `, `Your email verification code is ${code}. Valid for 10 minutes.`),
  };
}

/** Vote confirmation email (post-vote) */
export function templateVoteConfirmation(): { subject: string; html: string } {
  const timestamp = new Date().toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return {
    subject: `Your Vote Has Been Cast — ELP Moi Chapter`,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:64px;height:64px;background-color:#f0fdf4;border-radius:50%;line-height:64px;font-size:32px;">✓</div>
      </div>
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${BRAND.textDark};text-align:center;">Vote Successfully Cast</h2>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.6;text-align:center;">
        Your vote has been securely recorded in the ELP Moi Chapter elections.
      </p>
      <div style="background-color:#f8fafc;border:1px solid ${BRAND.borderLight};border-radius:8px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:13px;color:${BRAND.textMuted};">Timestamp</p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:${BRAND.textDark};">${timestamp}</p>
      </div>
      <p style="margin:24px 0 0;font-size:15px;color:${BRAND.textMuted};text-align:center;line-height:1.6;">
        Thank you for participating in the ELP Moi Chapter democratic process. 🎉
      </p>
    `, 'Your vote has been successfully recorded.'),
  };
}

/** Candidate application received notification */
export function templateCandidateReceived(position: string): { subject: string; html: string } {
  return {
    subject: `Candidacy Application Received — ELP Moi Chapter`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${BRAND.textDark};">Application Received</h2>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.6;">
        Your candidacy application for <strong style="color:${BRAND.textDark};">${position}</strong> has been received by the Independent Electoral Commission.
      </p>
      <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;">
        <p style="margin:0;font-size:13px;color:#1e40af;">You will be notified via email once the IEC has reviewed your application.</p>
      </div>
    `, `Your candidacy for ${position} has been received.`),
  };
}

/** Candidate approved notification */
export function templateCandidateApproved(position: string): { subject: string; html: string } {
  return {
    subject: `Candidacy Approved — ELP Moi Chapter`,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:64px;height:64px;background-color:#f0fdf4;border-radius:50%;line-height:64px;font-size:32px;">🎉</div>
      </div>
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${BRAND.accent};text-align:center;">Congratulations!</h2>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.6;text-align:center;">
        Your candidacy for <strong style="color:${BRAND.textDark};">${position}</strong> has been <strong style="color:${BRAND.accent};">APPROVED</strong> by the IEC.
      </p>
      <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">You will appear on the official ballot.</p>
      </div>
    `, `Your candidacy for ${position} has been approved!`),
  };
}

/** Candidate rejected notification */
export function templateCandidateRejected(position: string, reason: string): { subject: string; html: string } {
  return {
    subject: `Candidacy Update — ELP Moi Chapter`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${BRAND.textDark};">Candidacy Review Update</h2>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.6;">
        Your candidacy application for <strong style="color:${BRAND.textDark};">${position}</strong> has not been approved by the IEC.
      </p>
      <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#991b1b;">Reason:</p>
        <p style="margin:0;font-size:14px;color:#991b1b;">${reason}</p>
      </div>
      <p style="margin:24px 0 0;font-size:13px;color:${BRAND.textMuted};">
        If you believe this is an error, please contact the IEC directly for clarification.
      </p>
    `, `Your candidacy for ${position} was not approved.`),
  };
}

// ── Core Send Function ──────────────────────────────────────────────────────────

/**
 * Send an email via Resend.
 * Creates an EmailLog audit record before sending.
 * Throws on failure. Use tryEmailSend for non-critical emails.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const log = await prisma.emailLog.create({
    data: { to, subject, status: 'PENDING' },
  });

  // Simulation mode
  if (IS_SIMULATION || !resend) {
    console.log(
      `\n📧 [EMAIL SIMULATION → ${to}]\n` +
      `   Subject: ${subject}\n` +
      `   (No real email sent — RESEND_API_KEY missing)\n`
    );
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: 'SIMULATED' },
    });
    return;
  }

  // Live mode
  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });

    const resendId = result.data?.id || null;

    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: 'SENT',
        resendId,
      },
    });

    console.log(`[EMAIL] ✅ Sent to ${to}: subject="${subject}", resendId=${resendId ?? 'N/A'}`);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[EMAIL] ❌ Failed to send to ${to}: ${error.message}`);

    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        failureReason: error.message,
      },
    });

    throw error;
  }
}

// ── Convenience Wrappers ────────────────────────────────────────────────────────

/** Send a vote-day OTP email */
export async function sendEmailOTP(to: string, code: string): Promise<void> {
  const { subject, html } = templateVoteOTP(code);
  await sendEmail(to, subject, html);
}

/** Send an email verification OTP (Phase A) */
export async function sendEmailVerificationOTP(to: string, code: string): Promise<void> {
  const { subject, html } = templateEmailVerification(code);
  await sendEmail(to, subject, html);
}

/** Non-throwing email send — returns true on success, false on failure */
export async function tryEmailSend(to: string, subject: string, html: string): Promise<boolean> {
  try {
    await sendEmail(to, subject, html);
    return true;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[EMAIL] tryEmailSend failed silently for ${to}: ${error.message}`);
    return false;
  }
}

// ── Email Masking Helper ────────────────────────────────────────────────────────

/**
 * Masks an email address for safe display in API responses.
 * "john.doe@gmail.com" → "j****@gmail.com"
 * "ab@example.org" → "a****@example.org"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '****@****';
  const visible = local.charAt(0);
  return `${visible}****@${domain}`;
}
