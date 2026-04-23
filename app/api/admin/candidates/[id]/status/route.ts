import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { sendSMS, SMS_TEMPLATES } from "@/lib/sms";
import { requireAdminSession } from "@/lib/admin-auth";

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

    // Send notification SMS
    if (status === "APPROVED") {
      await sendSMS(
        candidate.phone,
        SMS_TEMPLATES.candidateApproved(candidate.position),
      );
    } else if (status === "REJECTED") {
      await sendSMS(
        candidate.phone,
        SMS_TEMPLATES.candidateRejected(candidate.position, rejectionNote!),
      );
    }

    return success({
      message: `Candidate ${status.toLowerCase()} successfully`,
      candidate: updated,
    });
  } catch (err) {
    return serverError(err);
  }
}
