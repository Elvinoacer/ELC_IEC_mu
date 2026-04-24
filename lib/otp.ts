/**
 * OTP Generation & Verification Service
 *
 * Supports two OTP flows:
 * - VOTE: Vote-day OTP sent to voter's verified email (keyed by phone)
 * - EMAIL_REG: Email registration OTP sent to unverified email (keyed by email)
 */

import { sendEmailOTP, sendEmailVerificationOTP } from './email';
import { prisma } from './prisma';

const OTP_TTL_MS = Number(process.env.OTP_TTL_SECONDS ?? 300) * 1000;
const EMAIL_REG_OTP_TTL_MS = Number(process.env.EMAIL_REG_OTP_TTL_SECONDS ?? 600) * 1000;
const OTP_DIGITS = Number(process.env.OTP_DIGITS ?? 6);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 3);
const OTP_MAX_PER_HOUR = Number(process.env.OTP_MAX_PER_HOUR ?? 5);
export const OTP_COOLDOWN_SECONDS = 60;

function generateCode(digits = OTP_DIGITS): string {
  return String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, '0');
}

// ── Vote-Day OTP Functions (keyed by phone) ─────────────────────────────────────

export async function findRecentReusableOTP(phone: string) {
  const now = new Date();

  return prisma.otpRequest.findFirst({
    where: {
      phone,
      verified: false,
      expiresAt: { gt: now },
      attempts: { lt: OTP_MAX_ATTEMPTS },
      purpose: 'VOTE',
    },
    orderBy: { sentAt: 'desc' },
  });
}

export async function getOTPRateLimitState(phone: string, ipAddress?: string): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const now = Date.now();

  const recentByPhone = await prisma.otpRequest.findMany({
    where: { phone, sentAt: { gt: oneHourAgo } },
    orderBy: { sentAt: 'asc' },
    select: { sentAt: true },
  });

  if (recentByPhone.length >= OTP_MAX_PER_HOUR) {
    const oldestWithinWindow = recentByPhone[0]?.sentAt?.getTime() ?? now;
    const retryAfterSeconds = Math.max(0, Math.ceil((oldestWithinWindow + 60 * 60 * 1000 - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  if (ipAddress) {
    const recentByIp = await prisma.otpRequest.findMany({
      where: { ipAddress, sentAt: { gt: oneHourAgo } },
      orderBy: { sentAt: 'asc' },
      select: { sentAt: true },
    });

    if (recentByIp.length >= OTP_MAX_PER_HOUR * 2) {
      const oldest = recentByIp[0]?.sentAt?.getTime() ?? now;
      const retryAfterSeconds = Math.max(0, Math.ceil((oldest + 60 * 60 * 1000 - now) / 1000));
      return { allowed: false, retryAfterSeconds };
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}


export async function checkOTPRateLimit(phone: string, ipAddress?: string): Promise<boolean> {
  const state = await getOTPRateLimitState(phone, ipAddress);
  return state.allowed;
}

/**
 * Send a vote-day OTP. Delivers via email to the voter's verified email address.
 */
export async function sendOTP(
  phone: string,
  voterEmail: string,
  ipAddress?: string
): Promise<{ expiresAt: Date; emailFailed: boolean }> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  // Invalidate all previous unverified OTPs for this phone
  await prisma.otpRequest.updateMany({
    where: { phone, verified: false, purpose: 'VOTE' },
    data: { expiresAt: new Date(0) },
  });

  // Create the new OTP record
  await prisma.otpRequest.create({
    data: { phone, code, expiresAt, verified: false, ipAddress, purpose: 'VOTE' },
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n🔑 [TESTING] OTP for ${phone}: ${code}\n`);
  }

  // Send email — but don't let a delivery failure crash the OTP flow.
  let emailFailed = false;
  try {
    await sendEmailOTP(voterEmail, code);
  } catch (emailErr) {
    emailFailed = true;
    console.error(
      `[OTP] OTP created for ${phone} but email delivery failed:`,
      emailErr instanceof Error ? emailErr.message : emailErr
    );
  }

  return { expiresAt, emailFailed };
}

export type VerifyResult =
  | { status: 'ok' }
  | { status: 'expired' }
  | { status: 'wrong'; attemptsLeft: number }
  | { status: 'locked'; attemptsLeft: 0 };

export async function verifyOTP(phone: string, code: string): Promise<VerifyResult> {
  const now = new Date();

  const record = await prisma.otpRequest.findFirst({
    where: { phone, verified: false, expiresAt: { gt: now }, purpose: 'VOTE' },
    orderBy: { sentAt: 'desc' },
  });

  if (!record) return { status: 'expired' };

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { status: 'locked', attemptsLeft: 0 };
  }

  if (record.code !== code) {
    const attempts = record.attempts + 1;
    await prisma.otpRequest.update({
      where: { id: record.id },
      data: { attempts },
    });

    const attemptsLeft = Math.max(0, OTP_MAX_ATTEMPTS - attempts);
    if (attemptsLeft === 0) {
      await prisma.otpRequest.update({ where: { id: record.id }, data: { expiresAt: new Date(0) } });
      return { status: 'locked', attemptsLeft: 0 };
    }

    return { status: 'wrong', attemptsLeft };
  }

  await prisma.otpRequest.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return { status: 'ok' };
}

// ── Email Registration OTP Functions (keyed by email, Phase A) ──────────────────

/**
 * Rate limit check for email-registration OTPs (Phase A).
 */
export async function getOTPRateLimitStateByEmail(
  email: string,
  ipAddress?: string
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const now = Date.now();

  const recentByEmail = await prisma.otpRequest.findMany({
    where: { email, purpose: 'EMAIL_REG', sentAt: { gt: oneHourAgo } },
    orderBy: { sentAt: 'asc' },
    select: { sentAt: true },
  });

  if (recentByEmail.length >= OTP_MAX_PER_HOUR) {
    const oldest = recentByEmail[0]?.sentAt?.getTime() ?? now;
    const retryAfterSeconds = Math.max(0, Math.ceil((oldest + 60 * 60 * 1000 - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  if (ipAddress) {
    const recentByIp = await prisma.otpRequest.findMany({
      where: { ipAddress, purpose: 'EMAIL_REG', sentAt: { gt: oneHourAgo } },
      orderBy: { sentAt: 'asc' },
      select: { sentAt: true },
    });

    if (recentByIp.length >= OTP_MAX_PER_HOUR * 2) {
      const oldest = recentByIp[0]?.sentAt?.getTime() ?? now;
      const retryAfterSeconds = Math.max(0, Math.ceil((oldest + 60 * 60 * 1000 - now) / 1000));
      return { allowed: false, retryAfterSeconds };
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Send an email-registration OTP (Phase A). Uses longer TTL.
 */
export async function sendEmailRegistrationOTP(
  email: string,
  phone: string,
  ipAddress?: string
): Promise<{ expiresAt: Date; emailFailed: boolean }> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + EMAIL_REG_OTP_TTL_MS);

  // Invalidate previous unverified email-reg OTPs for this email
  await prisma.otpRequest.updateMany({
    where: { email, verified: false, purpose: 'EMAIL_REG' },
    data: { expiresAt: new Date(0) },
  });

  // Create OTP record keyed by email
  await prisma.otpRequest.create({
    data: {
      phone: null,
      email,
      code,
      expiresAt,
      verified: false,
      ipAddress,
      purpose: 'EMAIL_REG',
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n🔑 [TESTING] Email verification OTP for ${email}: ${code}\n`);
  }

  let emailFailed = false;
  try {
    await sendEmailVerificationOTP(email, code);
  } catch (err) {
    emailFailed = true;
    console.error(
      `[OTP] Email verification OTP created for ${email} but delivery failed:`,
      err instanceof Error ? err.message : err
    );
  }

  return { expiresAt, emailFailed };
}

/**
 * Verify an email-registration OTP (Phase A). Queries by email field.
 */
export async function verifyOTPByEmail(email: string, code: string): Promise<VerifyResult> {
  const now = new Date();

  const record = await prisma.otpRequest.findFirst({
    where: { email, verified: false, expiresAt: { gt: now }, purpose: 'EMAIL_REG' },
    orderBy: { sentAt: 'desc' },
  });

  if (!record) return { status: 'expired' };

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { status: 'locked', attemptsLeft: 0 };
  }

  if (record.code !== code) {
    const attempts = record.attempts + 1;
    await prisma.otpRequest.update({
      where: { id: record.id },
      data: { attempts },
    });

    const attemptsLeft = Math.max(0, OTP_MAX_ATTEMPTS - attempts);
    if (attemptsLeft === 0) {
      await prisma.otpRequest.update({ where: { id: record.id }, data: { expiresAt: new Date(0) } });
      return { status: 'locked', attemptsLeft: 0 };
    }

    return { status: 'wrong', attemptsLeft };
  }

  await prisma.otpRequest.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return { status: 'ok' };
}
