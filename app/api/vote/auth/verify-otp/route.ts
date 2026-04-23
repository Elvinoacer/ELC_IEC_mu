import { NextRequest } from 'next/server';
import { z } from 'zod';
import { serialize } from 'cookie';
import prisma from '@/lib/prisma';
import { success, error, serverError } from '@/lib/response';
import { normalizePhone } from '@/lib/phone';
import { verifyOTP } from '@/lib/otp';
import { signVoterToken } from '@/lib/jwt';

const verifySchema = z.object({
  phone: z.string().min(1),
  code: z.string().length(6, 'OTP must be 6 digits'),
  deviceHash: z.string().min(1, 'Device fingerprint missing'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = verifySchema.safeParse(body);

    if (!result.success) {
      return error(result.error.issues[0].message, 400);
    }

    const { phone, code, deviceHash } = result.data;
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return error('Invalid phone number format.', 400);
    }

    // 1. Check voter exists and hasn't voted
    const voter = await prisma.voter.findUnique({ where: { phone: normalizedPhone } });
    if (!voter) return error('Voter not found.', 404);
    if (voter.hasVoted) return error('You have already voted.', 409);

    // 2. Verify OTP
    const verifyResult = await verifyOTP(normalizedPhone, code);
    if (verifyResult === 'expired') return error('OTP has expired or is invalid.', 400);
    if (verifyResult === 'wrong') return error('Incorrect OTP.', 400);
    if (verifyResult === 'locked') return error('Too many incorrect attempts.', 429);

    // 3. Device Fingerprint Logic
    let deviceWarning = false;

    if (!voter.deviceHash) {
      // First time login
      await prisma.voter.update({
        where: { id: voter.id },
        data: { deviceHash }
      });
    } else if (voter.deviceHash !== deviceHash) {
      // Different device used, but hasn't voted yet
      deviceWarning = true;
      await prisma.voter.update({
        where: { id: voter.id },
        data: { deviceHash } // update to the new device
      });
    }

    // 4. Issue JWT
    const token = await signVoterToken(normalizedPhone, voter.id);
    const cookieHeader = serialize('vote_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 3600, // 1 hour to cast vote
    });

    const res = success({ 
      message: 'Verified successfully',
      deviceWarning 
    });
    
    res.headers.set('Set-Cookie', cookieHeader);
    return res;

  } catch (err) {
    return serverError(err);
  }
}
