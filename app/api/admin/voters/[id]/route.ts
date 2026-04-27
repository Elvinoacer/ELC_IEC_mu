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

      const updateData: { 
        name: string | null; 
        email?: string | null; 
        emailVerified?: boolean; 
      } = { name: normalizedName || null };

      // If email is being changed, reset emailVerified
      if (emailValue !== undefined) {
        // [SECURITY] Restrict email changes: Only SUPER_ADMIN can do it freely.
        // Others must provide a reason.
        if (auth.admin.role !== "SUPER_ADMIN") {
          const reason = typeof body.reason === "string" ? body.reason.trim() : "";
          if (reason.length < 5) {
            return error(
              "Changing a voter's email requires a valid reason (min 5 chars) for audit review.",
              400
            );
          }
          (updateData as any).emailUpdateReason = reason; // Note: we don't store this on Voter, but it's in the audit log
        }

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
        data: {
          name: updateData.name,
          email: updateData.email,
          emailVerified: updateData.emailVerified,
        },
      });

      const auditDetails: Record<string, unknown> = {
        phone: voter.phone,
        oldName: voter.name,
        newName: normalizedName || null,
      };
      if (emailValue !== undefined) {
        auditDetails.oldEmail = voter.email;
        auditDetails.newEmail = emailValue || null;
        auditDetails.emailVerifiedReset = true;
        auditDetails.reason = body.reason || "SUPER_ADMIN Action";
      }

      await logAudit(req, auth.admin.id, emailValue !== undefined ? "ADMIN_UPDATE_VOTER_EMAIL" : "EDIT_VOTER", "Voter", voterId, auditDetails);

      return success({ message: "Voter updated" });
    }

    if (action === "reset") {
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (reason.length < 5) {
        return error("A reset reason (min 5 chars) is required.", 400);
      }

      // Role restriction: Only SUPER_ADMIN can reset a voter
      if (auth.admin.role !== "SUPER_ADMIN") {
        return error(
          "Unauthorized. Only a SUPER_ADMIN can reset voter status.",
          403,
        );
      }

      // Capture current votes before deletion for audit trail
      const currentVotes = await prisma.vote.findMany({
        where: { voterId },
        include: {
          candidate: { select: { name: true, position: true } },
        },
      });

      // Transaction: Delete votes and reset voter status
      await prisma.$transaction(async (tx) => {
        await tx.vote.deleteMany({ where: { voterId } });
        await tx.voter.update({
          where: { id: voterId },
          data: {
            hasVoted: false,
            votedAt: null,
            deviceHash: null,
          },
        });
      });

      const auditDetails: Record<string, unknown> = {
        phone: voter.phone,
        name: voter.name,
        resetBy: auth.admin.username,
        reason,
        deletedVotes: currentVotes.map((v) => ({
          position: v.position,
          candidate: v.candidate.name,
        })),
      };

      await logAudit(
        req,
        auth.admin.id,
        "RESET_VOTER",
        "Voter",
        voterId,
        auditDetails,
      );

      return success({ message: "Voter has been reset successfully" });
    }

    return error("Invalid action", 400);
  } catch (err) {
    return serverError(err);
  }
}
