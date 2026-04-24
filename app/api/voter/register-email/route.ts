import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { success, error, serverError } from '@/lib/response';
import { normalizePhone } from '@/lib/phone';
import { maskEmail } from '@/lib/email';
import { getOTPRateLimitStateByEmail, sendEmailRegistrationOTP, OTP_COOLDOWN_SECONDS } from '@/lib/otp';

const schema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email format'),
});

/**
 * Phase A Step 1 — Voter submits phone + email.
 * Sends a verification OTP to the email address.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) return error(result.error.issues[0].message, 400);

    const { email } = result.data;
    const normalizedPhone = normalizePhone(result.data.phone);
    if (!normalizedPhone) return error('Invalid phone number format.', 400);

    // Guard: Registration Window
    const config = await prisma.votingConfig.findUnique({ where: { id: 1 } });
    if (config) {
      const now = new Date();
      if (config.isManuallyClosed) {
        return error('Voter registration is currently suspended by the IEC.', 403);
      }
      if (config.candidateRegOpensAt && now < config.candidateRegOpensAt) {
        return error('Voter registration has not opened yet.', 403);
      }
      if (config.candidateRegClosesAt && now > config.candidateRegClosesAt) {
        return error('Voter registration has officially closed.', 403);
      }
    }

    // 1. Look up voter by phone
    const voter = await prisma.voter.findUnique({ where: { phone: normalizedPhone } });
    if (!voter) return error('This phone number is not registered in the ELP voter registry.', 404);

    // 2. If already verified, reject
    if (voter.emailVerified && voter.email) {
      return error('An email is already verified for this account. Contact the IEC to change it.', 409);
    }

    // 3. Check email not taken by another voter
    const emailTaken = await prisma.voter.findFirst({
      where: { email, id: { not: voter.id } },
    });
    if (emailTaken) {
      return error('This email is already linked to another voter account.', 409);
    }

    // 4. Rate limit
    const ipAddress = req.headers.get('x-forwarded-for') || undefined;
    const rateLimit = await getOTPRateLimitStateByEmail(email, ipAddress);
    if (!rateLimit.allowed) {
      return error(
        `Too many OTP requests. Try again in ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minute(s).`,
        429
      );
    }

    // 5. Temporarily store email (unverified) on voter record
    await prisma.voter.update({
      where: { id: voter.id },
      data: { email, emailVerified: false },
    });

    // 6. Send email verification OTP
    const { expiresAt, emailFailed } = await sendEmailRegistrationOTP(email, normalizedPhone, ipAddress);

    return success({
      expiresAt: expiresAt.toISOString(),
      cooldownSeconds: OTP_COOLDOWN_SECONDS,
      maskedEmail: maskEmail(email),
      ...(emailFailed && { emailWarning: 'OTP created but email delivery may have failed. Try requesting a new code.' }),
    });
  } catch (err) {
    return serverError(err);
  }
}
