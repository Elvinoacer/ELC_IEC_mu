import { NextRequest } from 'next/server';
import { z } from 'zod';
import { serialize } from 'cookie';
import prisma from '@/lib/prisma';
import { success, error, serverError } from '@/lib/response';
import { NextResponse } from 'next/server';
import { normalizePhone } from '@/lib/phone';
import { verifyOTP } from '@/lib/otp';
import { signVoterToken } from '@/lib/jwt';

const verifySchema = z.object({
  phone: z.string().min(1),
  code: z.string().length(6, 'OTP must be 6 digits'),
  deviceHash: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = verifySchema.safeParse(body);

    if (!result.success) return error(result.error.issues[0].message, 400);

    const { phone, code, deviceHash } = result.data;
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return error('Invalid phone number format.', 400);

    const voter = await prisma.voter.findUnique({ where: { phone: normalizedPhone } });
    if (!voter) return error('Voter not found.', 404);
    if (voter.hasVoted) return error('You have already voted.', 409);

    const verifyResult = await verifyOTP(normalizedPhone, code);
    if (verifyResult.status === 'expired') return error('OTP expired. Request a new code.', 400);
    if (verifyResult.status === 'wrong') {
      return NextResponse.json({
        ok: false,
        error: 'Invalid code',
        attemptsLeft: verifyResult.attemptsLeft,
        invalidated: false,
      }, { status: 400 });
    }
    if (verifyResult.status === 'locked') {
      return NextResponse.json({
        ok: false,
        error: 'Code invalidated after too many attempts. Request a new code.',
        attemptsLeft: 0,
        invalidated: true,
      }, { status: 400 });
    }

    let deviceWarning = false;

    if (deviceHash) {
      if (!voter.deviceHash) {
        await prisma.voter.update({ where: { id: voter.id }, data: { deviceHash } });
      } else if (voter.deviceHash !== deviceHash) {
        deviceWarning = true;
        await prisma.voter.update({ where: { id: voter.id }, data: { deviceHash } });
      }
    }

    const token = await signVoterToken(normalizedPhone, voter.id);
    const cookieHeader = serialize('vote_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 900,
    });

    const res = success({ message: 'Verified successfully', deviceWarning });
    res.headers.set('Set-Cookie', cookieHeader);
    return res;
  } catch (err) {
    return serverError(err);
  }
}
