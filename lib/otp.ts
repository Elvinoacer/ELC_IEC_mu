/**
 * OTP Generation & Verification Service
 */

import { sendSMS, SMS_TEMPLATES } from './sms';
import { prisma } from './prisma';

const OTP_TTL_MS = Number(process.env.OTP_TTL_SECONDS ?? 300) * 1000;
const OTP_DIGITS = Number(process.env.OTP_DIGITS ?? 6);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 3);
const OTP_MAX_PER_HOUR = Number(process.env.OTP_MAX_PER_HOUR ?? 5);

function generateCode(digits = OTP_DIGITS): string {
  return String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, '0');
}

export async function checkOTPRateLimit(phone: string, ipAddress?: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  // 1. Check by phone
  const phoneCount = await prisma.otpRequest.count({
    where: { phone, sentAt: { gt: oneHourAgo } },
  });
  if (phoneCount >= OTP_MAX_PER_HOUR) return false;

  // 2. Check by IP (stricter limit to prevent bulk spam)
  if (ipAddress) {
    const ipCount = await prisma.otpRequest.count({
      where: { ipAddress, sentAt: { gt: oneHourAgo } },
    });
    if (ipCount >= (OTP_MAX_PER_HOUR * 2)) return false; // Allow 10 per IP per hour
  }

  return true;
}

export async function sendOTP(phone: string, ipAddress?: string): Promise<void> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  // Invalidate any previous un-verified OTPs for this phone
  await prisma.otpRequest.updateMany({
    where: { phone, verified: false },
    data: { expiresAt: new Date(0) }, // expire them immediately
  });

  await prisma.otpRequest.create({
    data: { phone, code, expiresAt, verified: false, ipAddress },
  });

  await sendSMS(phone, SMS_TEMPLATES.otp(code));
}

export type VerifyResult = 'ok' | 'expired' | 'wrong' | 'locked';

export async function verifyOTP(phone: string, code: string): Promise<VerifyResult> {
  const now = new Date();

  // Find the latest un-verified, un-expired OTP
  const record = await prisma.otpRequest.findFirst({
    where: { phone, verified: false, expiresAt: { gt: now } },
    orderBy: { sentAt: 'desc' },
  });

  if (!record) return 'expired';

  // Check lockout
  if (record.attempts >= OTP_MAX_ATTEMPTS) return 'locked';

  if (record.code !== code) {
    // Increment attempts
    await prisma.otpRequest.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    
    // Check if they just hit the limit
    if (record.attempts + 1 >= OTP_MAX_ATTEMPTS) return 'locked';
    return 'wrong';
  }

  await prisma.otpRequest.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return 'ok';
}
