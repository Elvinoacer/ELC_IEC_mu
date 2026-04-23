import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { success, error, serverError } from '@/lib/response';

const schema = z.object({
  deviceHash: z.string().min(1, 'Device fingerprint missing'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) return error(parsed.error.issues[0].message, 400);

    const voter = await prisma.voter.findFirst({
      where: {
        deviceHash: parsed.data.deviceHash,
        hasVoted: true,
      },
      select: { id: true },
    });

    return success({ hasVotedOnThisDevice: Boolean(voter) });
  } catch (err) {
    return serverError(err);
  }
}
