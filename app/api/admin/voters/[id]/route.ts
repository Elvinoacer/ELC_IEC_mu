import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    const { id } = await params;
    const voterId = parseInt(id, 10);

    if (isNaN(voterId)) {
      return error("Invalid voter ID", 400);
    }

    const voter = await prisma.voter.findUnique({
      where: { id: voterId },
    });

    if (!voter) {
      return error("Voter not found", 404);
    }

    if (voter.hasVoted) {
      return error("Cannot delete a voter who has already cast a vote", 403);
    }

    await prisma.voter.delete({
      where: { id: voterId },
    });

    await logAudit(
      req,
      auth.admin.id,
      "DELETE_VOTER",
      "Voter",
      voterId,
      { phone: voter.phone, name: voter.name }
    );

    return success({ message: "Voter deleted successfully" });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    const { id } = await params;
    const voterId = parseInt(id, 10);
    if (isNaN(voterId)) return error("Invalid voter ID", 400);

    const body = await req.json();
    const { action, name } = body;

    const voter = await prisma.voter.findUnique({ where: { id: voterId } });
    if (!voter) return error("Voter not found", 404);

    if (action === 'edit') {
      await prisma.voter.update({
        where: { id: voterId },
        data: { name: name || null },
      });

      await logAudit(
        req,
        auth.admin.id,
        "EDIT_VOTER",
        "Voter",
        voterId,
        { phone: voter.phone, oldName: voter.name, newName: name }
      );

      return success({ message: "Voter name updated" });
    } 
    
    if (action === 'reset') {
      const { reason } = body;
      if (!reason || reason.length < 5) {
        return error("A valid reason (min 5 chars) is required for resetting a voter.", 400);
      }

      // Role restriction: Only SUPER_ADMIN can reset a voter
      if (auth.admin.role !== 'SUPER_ADMIN') {
        return error("Unauthorized. Only a SUPER_ADMIN can reset voter status.", 403);
      }

      // Capture current votes for audit before deletion
      const currentVotes = await prisma.vote.findMany({
        where: { voterId },
        include: { candidate: { select: { name: true, position: true } } }
      });

      // Used for genuine errors only
      await prisma.voter.update({
        where: { id: voterId },
        data: { 
          hasVoted: false,
          votedAt: null,
          deviceHash: null
        },
      });
      // Delete any associated votes for this voter
      await prisma.vote.deleteMany({
        where: { voterId },
      });

      await logAudit(
        req,
        auth.admin.id,
        "RESET_VOTER",
        "Voter",
        voterId,
        { 
          phone: voter.phone, 
          reason,
          deletedVotes: currentVotes.map(v => ({ 
            position: v.position, 
            candidate: v.candidate.name 
          }))
        }
      );

      return success({ message: "Voter has been reset successfully" });
    }

    return error("Invalid action", 400);
  } catch (err) {
    return serverError(err);
  }
}
