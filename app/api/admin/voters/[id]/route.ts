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

    await logAudit(req, auth.admin.id, "DELETE_VOTER", "Voter", voterId, {
      phone: voter.phone,
      name: voter.name,
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

    if (action === "edit") {
      const normalizedName = typeof name === "string" ? name.trim() : "";
      const emailValue = typeof body.email === "string" ? body.email.trim() : undefined;

      const updateData: any = { name: normalizedName || null };

      // If email is being changed, reset emailVerified
      if (emailValue !== undefined) {
        if (emailValue === "") {
          updateData.email = null;
          updateData.emailVerified = false;
        } else {
          // Check email not taken by another voter
          const emailTaken = await prisma.voter.findFirst({
            where: { email: emailValue, id: { not: voterId } },
          });
          if (emailTaken) {
            return error("This email is already linked to another voter.", 409);
          }
          updateData.email = emailValue;
          updateData.emailVerified = false;
        }
      }

      await prisma.voter.update({
        where: { id: voterId },
        data: updateData,
      });

      const auditDetails: any = {
        phone: voter.phone,
        oldName: voter.name,
        newName: normalizedName || null,
      };
      if (emailValue !== undefined) {
        auditDetails.oldEmail = voter.email;
        auditDetails.newEmail = emailValue || null;
        auditDetails.emailVerifiedReset = true;
      }

      await logAudit(req, auth.admin.id, emailValue !== undefined ? "ADMIN_UPDATE_VOTER_EMAIL" : "EDIT_VOTER", "Voter", voterId, auditDetails);

      return success({ message: "Voter updated" });
    }

    if (action === "reset") {
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (reason.length < 5) {
        return error(
          "A valid reason (min 5 chars) is required for resetting a voter.",
          400,
        );
      }

      // Role restriction: Only SUPER_ADMIN can reset a voter
      if (auth.admin.role !== "SUPER_ADMIN") {
        return error(
          "Unauthorized. Only a SUPER_ADMIN can reset voter status.",
          403,
        );
      }

      // Capture current votes before deletion for both audit and counter fixes.
      const currentVotes = await prisma.vote.findMany({
        where: { voterId },
        include: {
          candidate: { select: { id: true, name: true, position: true } },
        },
      });

      const affectedCandidateIds = Array.from(
        new Set(currentVotes.map((vote) => vote.candidateId)),
      );

      const updatedCandidateCounts: { candidateId: number; votes: number }[] =
        [];

      await prisma.$transaction(async (tx) => {
        await tx.vote.deleteMany({
          where: { voterId },
        });

        await tx.voter.update({
          where: { id: voterId },
          data: {
            hasVoted: false,
            votedAt: null,
            deviceHash: null,
          },
        });

        for (const candidateId of affectedCandidateIds) {
          const actualVotes = await tx.vote.count({
            where: { candidateId },
          });

          await tx.candidate.update({
            where: { id: candidateId },
            data: { votes: actualVotes },
          });

          updatedCandidateCounts.push({ candidateId, votes: actualVotes });
        }
      });

      await logAudit(req, auth.admin.id, "RESET_VOTER", "Voter", voterId, {
        phone: voter.phone,
        reason,
        deletedVotes: currentVotes.map((v) => ({
          position: v.position,
          candidate: v.candidate.name,
        })),
        candidateVoteRecalculation: updatedCandidateCounts,
      });

      return success({ message: "Voter has been reset successfully" });
    }

    return error("Invalid action", 400);
  } catch (err) {
    return serverError(err);
  }
}
