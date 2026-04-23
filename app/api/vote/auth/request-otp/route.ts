import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { success, error, serverError } from '@/lib/response';
import { normalizePhone } from '@/lib/phone';
import { sendOTP, checkOTPRateLimit } from '@/lib/otp';

const schema = z.object({
  phone: z.string().min(1, 'Phone is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return error(result.error.issues[0].message, 400);
    }

    const normalizedPhone = normalizePhone(result.data.phone);

    if (!normalizedPhone) {
      return error('Invalid phone number format.', 400);
    }

    // 1. Check if voter exists
    const voter = await prisma.voter.findUnique({
      where: { phone: normalizedPhone }
    });

    if (!voter) {
      return error('This number is not registered in the ELP Moi Chapter voter registry.', 404);
    }

    // 2. Check if they already voted
    if (voter.hasVoted) {
      return error('You have already cast your vote. Redirecting to results...', 409);
    }

    // 3. Check voting window config
    const config = await prisma.votingConfig.findUnique({ where: { id: 1 } });
    if (config) {
      const now = new Date();
      if (config.isManuallyClosed) {
        return error('The voting system is currently closed by the IEC.', 403);
      }
      if (now < config.opensAt) {
        return error('Voting has not started yet.', 403);
      }
      if (now > config.closesAt) {
        return error('Voting has already closed.', 403);
      }
    }

    // 4. Rate limiting for OTP sends
    const canSend = await checkOTPRateLimit(normalizedPhone);
    if (!canSend) {
      return error('Too many OTP requests. Please try again later.', 429);
    }

    // 5. Send OTP
    await sendOTP(normalizedPhone);

    return success({ message: 'OTP sent successfully' });
  } catch (err) {
    return serverError(err);
  }
}
