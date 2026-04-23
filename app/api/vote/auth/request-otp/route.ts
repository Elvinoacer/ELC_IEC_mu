import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { success, error, serverError } from '@/lib/response';
import { normalizePhone } from '@/lib/phone';
import { findRecentReusableOTP, getOTPRateLimitState, OTP_COOLDOWN_SECONDS, sendOTP } from '@/lib/otp';

const schema = z.object({
  phone: z.string().min(1, 'Phone is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) return error(result.error.issues[0].message, 400);

    const normalizedPhone = normalizePhone(result.data.phone);
    if (!normalizedPhone) return error('Invalid phone number format.', 400);

    const voter = await prisma.voter.findUnique({ where: { phone: normalizedPhone } });
    if (!voter) return error("This number isn't in the ELP voter registry.", 404);
    if (voter.hasVoted) return error('You have already cast your vote.', 409);

    const config = await prisma.votingConfig.findUnique({ where: { id: 1 } });
    if (config) {
      const now = new Date();
      if (config.isManuallyClosed) return error('The voting system is currently closed by the IEC.', 403);
      if (now < config.opensAt) return error('Voting has not started yet.', 403);
      if (now > config.closesAt) return error('Voting has already closed.', 403);
    }

    const ipAddress = req.headers.get('x-forwarded-for') || undefined;

    const rateLimit = await getOTPRateLimitState(normalizedPhone, ipAddress);
    if (!rateLimit.allowed) {
      return error(`Too many OTP requests. Try again in ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minute(s).`, 429);
    }

    const recentOtp = await findRecentReusableOTP(normalizedPhone);
    if (recentOtp) {
      return success({
        alreadySent: true,
        expiresAt: recentOtp.expiresAt.toISOString(),
        cooldownSeconds: OTP_COOLDOWN_SECONDS,
      });
    }

    const expiresAt = await sendOTP(normalizedPhone, ipAddress);

    return success({
      alreadySent: false,
      expiresAt: expiresAt.toISOString(),
      cooldownSeconds: OTP_COOLDOWN_SECONDS,
    });
  } catch (err) {
    return serverError(err);
  }
}
