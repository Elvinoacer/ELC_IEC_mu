import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { success, error, serverError } from '@/lib/response';
import { verifyVoterToken } from '@/lib/jwt';
import { generateResultsPayload } from '@/lib/results';
import { logVoteAttempt } from '@/lib/audit';

const submitSchema = z.object({
  deviceHash: z.string().min(1, 'Device fingerprint missing'),
  selections: z.array(z.object({
    position: z.string(),
    candidateId: z.number(),
  })).min(1, 'You must vote for at least one position'),
});

export async function POST(req: NextRequest) {
  let voterId: number | undefined;
  let phone: string | undefined;
  let deviceHashStr: string | undefined;

  try {
    // 1. Verify Voter JWT
    const token = req.cookies.get('vote_session')?.value;
    if (!token) return error('Unauthorized. Please log in again.', 401);

    const payload = await verifyVoterToken(token);
    if (!payload || !payload.id) return error('Invalid session.', 401);

    voterId = payload.id;
    phone = payload.phone;

    const body = await req.json();
    const result = submitSchema.safeParse(body);

    if (!result.success) return error(result.error.issues[0].message, 400);

    const { deviceHash, selections } = result.data;
    deviceHashStr = deviceHash;

    // 2. Transaction: Lock voter, verify not voted, cast votes, update stats
    await prisma.$transaction(async (tx) => {
      // Row-level lock on voter to prevent race conditions (double vote)
      const voter = await tx.$queryRaw<{ id: number; has_voted: boolean }[]>`
        SELECT id, has_voted FROM voters WHERE id = ${voterId} FOR UPDATE
      `;

      if (!voter.length || voter[0].has_voted) {
        throw new Error('ALREADY_VOTED');
      }

      // Verify each candidate is approved and matches the position
      for (const sel of selections) {
        const candidate = await tx.candidate.findUnique({
          where: { id: sel.candidateId }
        });
        
        if (!candidate) throw new Error(`INVALID_CANDIDATE_${sel.candidateId}`);
        if (candidate.status !== 'APPROVED') throw new Error(`CANDIDATE_NOT_APPROVED_${sel.candidateId}`);
        if (candidate.position !== sel.position) throw new Error(`POSITION_MISMATCH_${sel.candidateId}`);

        // Insert vote
        await tx.vote.create({
          data: {
            voterId: voterId!,
            candidateId: sel.candidateId,
            position: sel.position,
          }
        });

        // Increment candidate votes
        await tx.candidate.update({
          where: { id: sel.candidateId },
          data: { votes: { increment: 1 } }
        });
      }

      // Mark voter as voted
      await tx.voter.update({
        where: { id: voterId },
        data: {
          hasVoted: true,
          votedAt: new Date(),
          deviceHash, // lock the device fingerprint permanently
        }
      });
    });

    // Log success
    await logVoteAttempt(req, 'SUCCESS', { voterId, phone, deviceHash: deviceHashStr });

    // 3. Clear cookie
    const clearCookie = `vote_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict`;

    // 4. Trigger Real-time Broadcast
    try {
      const resultsPayload = await generateResultsPayload();
      await fetch('http://localhost:3001/internal/broadcast-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultsPayload),
      });
    } catch (e) {
      console.error('Failed to trigger socket.io broadcast:', e);
    }

    const res = success({ message: 'Vote submitted successfully' });
    res.headers.set('Set-Cookie', clearCookie);
    return res;

  } catch (err: any) {
    const status = err.message === 'ALREADY_VOTED' ? 'DUPLICATE' : 'FAILED';
    await logVoteAttempt(req, status, { 
      voterId: voterId, 
      phone: phone, 
      deviceHash: deviceHashStr,
      reason: err.message 
    });

    if (err.message === 'ALREADY_VOTED') {
      return error('You have already cast your vote.', 409);
    }
    if (err.message?.startsWith('INVALID_CANDIDATE') || err.message?.startsWith('CANDIDATE_NOT_APPROVED') || err.message?.startsWith('POSITION_MISMATCH')) {
      return error('Invalid candidate selection detected. Please refresh and try again.', 400);
    }
    // Prisma unique constraint violation (P2002) for votes means they already voted for this position
    if (err.code === 'P2002') {
      return error('Duplicate vote detected.', 409);
    }
    return serverError(err);
  }
}
