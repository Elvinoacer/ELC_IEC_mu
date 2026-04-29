import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { success, serverError } from '@/lib/response';
import { requireAdminSession } from '@/lib/admin-auth';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ('response' in auth) return auth.response;

    const [
      totalInSystem,
      totalWithEmail,
      totalRegistered,
      totalVoted,
      pendingCandidates,
      approvedCandidates,
      totalPositions
    ] = await Promise.all([
      prisma.voter.count(),
      prisma.voter.count({ where: { email: { not: null } } }),
      prisma.voter.count({ where: { emailVerified: true } }),
      prisma.voter.count({ where: { hasVoted: true } }),
      prisma.candidate.count({ where: { status: 'PENDING' } }),
      prisma.candidate.count({ where: { status: 'APPROVED' } }),
      prisma.position.count()
    ]);

    const turnout = totalRegistered > 0 ? (totalVoted / totalRegistered) * 100 : 0;

    return success({
      voters: {
        total: totalInSystem,
        withEmail: totalWithEmail,
        registered: totalRegistered,
        voted: totalVoted,
        remaining: totalRegistered - totalVoted,
        turnout: Number(turnout.toFixed(1))
      },
      candidates: {
        pending: pendingCandidates,
        approved: approvedCandidates
      },
      positions: totalPositions
    });
  } catch (err) {
    return serverError(err);
  }
}
