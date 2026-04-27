import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { success, error, serverError } from '@/lib/response';
import { requireAdminSession } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit';

const updateSchema = z.object({
  name: z.string().min(2).max(100),
  school: z.string().min(2).max(150),
  yearOfStudy: z.string(),
  positionId: z.number().int().positive().optional(),
  scholarCode: z.string(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminSession(req);
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const candidateId = parseInt(id, 10);
    if (isNaN(candidateId)) return error('Invalid candidate ID', 400);

    const body = await req.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) return error(result.error.issues[0].message, 400);

    // Ensure candidate exists
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) return error('Candidate not found', 404);

    // Only allow editing if pending or approved
    if (candidate.status === 'REJECTED') {
      return error('Cannot edit a rejected candidate application.', 403);
    }

    let updateData: any = { ...result.data };

    // [FIX] Prevent position changes once approved or votes exist 
    if (result.data.positionId && result.data.positionId !== candidate.positionId) {
      if (candidate.status === 'APPROVED') {
        return error('Cannot change position for an approved candidate. Please reject or reset them first.', 403);
      }

      const voteCount = await prisma.vote.count({
        where: { candidateId: candidate.id }
      });
      if (voteCount > 0) {
        return error('Cannot change position for a candidate who has already received votes.', 403);
      }

      // Fetch the new position title for denormalization
      const newPos = await prisma.position.findUnique({ where: { id: result.data.positionId } });
      if (!newPos) return error('Selected position does not exist.', 400);
      updateData.position = newPos.title;
    }

    // Check for scholar code uniqueness if changed
    if (result.data.scholarCode !== candidate.scholarCode) {
      const existing = await prisma.candidate.findUnique({
        where: { scholarCode: result.data.scholarCode }
      });
      if (existing) return error('Scholar code is already in use by another candidate.', 400);
    }

    const updated = await prisma.candidate.update({
      where: { id: candidateId },
      data: updateData,
    });

    await logAudit(
      req,
      auth.admin.id,
      "EDIT_CANDIDATE",
      "Candidate",
      candidateId,
      { old: candidate, new: updated }
    );

    return success(updated);
  } catch (err) {
    return serverError(err);
  }
}
