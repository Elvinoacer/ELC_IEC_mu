import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { success, error, serverError } from '@/lib/response';
import { normalizePhone } from '@/lib/phone';
import { verifyOTPByEmail } from '@/lib/otp';

const schema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email format'),
  code: z.string().length(6, 'OTP must be 6 digits'),
});

/**
 * Phase A Step 2 — Voter submits OTP to confirm email ownership.
 * On success, sets emailVerified = true.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) return error(result.error.issues[0].message, 400);

    const { email, code } = result.data;
    const normalizedPhone = normalizePhone(result.data.phone);
    if (!normalizedPhone) return error('Invalid phone number format.', 400);

    // 1. Look up voter
    const voter = await prisma.voter.findUnique({ where: { phone: normalizedPhone } });
    if (!voter) return error('Voter not found.', 404);

    // 2. Confirm email matches what was stored in Step 1
    if (voter.email !== email) {
      return error('Email mismatch. Please restart the registration process.', 409);
    }

    // 3. Already verified?
    if (voter.emailVerified) {
      return success({ message: 'Email is already verified.' });
    }

    // 4. Verify OTP by email
    const verifyResult = await verifyOTPByEmail(email, code);

    if (verifyResult.status === 'expired') {
      return error('OTP expired. Request a new code.', 400);
    }
    if (verifyResult.status === 'wrong') {
      return error(`Invalid code. ${verifyResult.attemptsLeft} attempt(s) left.`, 400);
    }
    if (verifyResult.status === 'locked') {
      return error('Code invalidated after too many attempts. Request a new code.', 400);
    }

    // 5. Mark email as verified
    await prisma.voter.update({
      where: { id: voter.id },
      data: { emailVerified: true },
    });

    return success({ message: 'Email verified and linked successfully.' });
  } catch (err) {
    return serverError(err);
  }
}
