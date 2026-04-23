import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";

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
      return success({ message: "Voter name updated" });
    } 
    
    if (action === 'reset') {
      // Used for genuine errors only (e.g., device locked to wrong person during testing)
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
      return success({ message: "Voter has been reset successfully" });
    }

    return error("Invalid action", 400);
  } catch (err) {
    return serverError(err);
  }
}
