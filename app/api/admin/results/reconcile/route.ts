import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

/**
 * Reconciliation API: Recalculates all candidate vote counts from the Vote table.
 * Restricted to SUPER_ADMIN.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    // Role restriction: Only SUPER_ADMIN can run reconciliation
    if (auth.admin.role !== 'SUPER_ADMIN') {
      return error("Unauthorized. Only a SUPER_ADMIN can run reconciliation.", 403);
    }

    const { reason } = await req.json().catch(() => ({}));
    if (!reason || reason.length < 5) {
      return error("A valid reason is required to perform reconciliation.", 400);
    }

    // 1. Get all candidates
    const candidates = await prisma.candidate.findMany({
      select: { id: true, name: true, votes: true }
    });

    const results: any[] = [];

    // 2. Perform reconciliation in a transaction
    await prisma.$transaction(async (tx) => {
      for (const candidate of candidates) {
        // Count actual votes in DB
        const actualCount = await tx.vote.count({
          where: { candidateId: candidate.id }
        });

        if (actualCount !== candidate.votes) {
          // Update candidate with correct count
          await tx.candidate.update({
            where: { id: candidate.id },
            data: { votes: actualCount }
          });

          results.push({
            candidate: candidate.name,
            oldVotes: candidate.votes,
            newVotes: actualCount,
            diff: actualCount - candidate.votes
          });
        }
      }
    });

    // 3. Log the operation
    await logAudit(
      req,
      auth.admin.id,
      "RECONCILE_VOTES",
      "System",
      undefined,
      { reason, corrections: results }
    );

    return success({
      message: "Reconciliation completed successfully",
      correctionsFound: results.length,
      details: results
    });

  } catch (err) {
    return serverError(err);
  }
}
