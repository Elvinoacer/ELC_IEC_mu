/**
 * OTP Generation & Verification Service
 */

import { sendSMS, SMS_TEMPLATES } from './sms';
import { prisma } from './prisma';

const OTP_TTL_MS = Number(process.env.OTP_TTL_SECONDS ?? 300) * 1000;
const OTP_DIGITS = Number(process.env.OTP_DIGITS ?? 6);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 3);
const OTP_MAX_PER_HOUR = Number(process.env.OTP_MAX_PER_HOUR ?? 5);
export const OTP_COOLDOWN_SECONDS = 60;

function generateCode(digits = OTP_DIGITS): string {
  return String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, '0');
}

export async function findRecentReusableOTP(phone: string) {
  const now = new Date();
  const sixtySecondsAgo = new Date(now.getTime() - OTP_COOLDOWN_SECONDS * 1000);

  return prisma.otpRequest.findFirst({
    where: {
      phone,
      verified: false,
      sentAt: { gte: sixtySecondsAgo },
      expiresAt: { gt: now },
      attempts: { lt: OTP_MAX_ATTEMPTS },
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

export async function sendOTP(phone: string, ipAddress?: string): Promise<Date> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.otpRequest.updateMany({
    where: { phone, verified: false },
    data: { expiresAt: new Date(0) },
  });

  await prisma.otpRequest.create({
    data: { phone, code, expiresAt, verified: false, ipAddress },
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n🔑 [TESTING] OTP for ${phone}: ${code}\n`);
  }

  await sendSMS(phone, SMS_TEMPLATES.otp(code));
  return expiresAt;
}

export type VerifyResult =
  | { status: 'ok' }
  | { status: 'expired' }
  | { status: 'wrong'; attemptsLeft: number }
  | { status: 'locked'; attemptsLeft: 0 };

export async function verifyOTP(phone: string, code: string): Promise<VerifyResult> {
  const now = new Date();

  const record = await prisma.otpRequest.findFirst({
    where: { phone, verified: false, expiresAt: { gt: now } },
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
