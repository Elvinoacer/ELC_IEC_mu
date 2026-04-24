import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { tryEmailSend, templateCandidateApproved, templateCandidateRejected } from "@/lib/email";
import { requireAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

const statusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionNote: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    const { id } = await params;
    const candidateId = parseInt(id, 10);

    if (isNaN(candidateId)) {
      return error("Invalid candidate ID", 400);
    }

    const body = await req.json();
    const result = statusSchema.safeParse(body);

    if (!result.success) {
      return error(result.error.issues[0].message, 400);
    }

    const { status, rejectionNote } = result.data;

    if (status === "REJECTED" && !rejectionNote?.trim()) {
      return error(
        "A rejection note is required when rejecting a candidate.",
        400,
      );
    }

    const adminId = auth.admin.id;

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return error("Candidate not found", 404);
    }

    if (candidate.status === status) {
      return error(`Candidate is already ${status}`, 400);
    }

    const updated = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        status,
        rejectionNote: status === "REJECTED" ? rejectionNote : null,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    // 2. Log audit
    await logAudit(
      req,
      adminId,
      status === "APPROVED" ? "APPROVE_CANDIDATE" : "REJECT_CANDIDATE",
      "Candidate",
      candidateId,
      {
        status,
        rejectionNote,
        candidateName: candidate.name,
        position: candidate.position,
      },
    );

    // 3. Send notification email (non-blocking)
    let emailSent = false;
    // Look up the voter's verified email via phone
    const voter = await prisma.voter.findUnique({
      where: { phone: candidate.phone },
      select: { email: true, emailVerified: true },
    });

    if (voter?.email && voter.emailVerified) {
      if (status === "APPROVED") {
        const { subject, html } = templateCandidateApproved(candidate.position);
        emailSent = await tryEmailSend(voter.email, subject, html);
      } else if (status === "REJECTED") {
        const { subject, html } = templateCandidateRejected(candidate.position, rejectionNote!);
        emailSent = await tryEmailSend(voter.email, subject, html);
      }
    }

    const emailWarning = emailSent ? null : "Candidate status was updated, but email notification could not be delivered.";

    return success({
      message: `Candidate ${status.toLowerCase()} successfully`,
      candidate: updated,
      emailWarning,
    });
  } catch (err) {
    return serverError(err);
  }
}
