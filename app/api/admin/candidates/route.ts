import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { normalizePhone } from "@/lib/phone";

const createCandidateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().min(1),
  school: z.string().trim().min(2).max(150),
  yearOfStudy: z.enum([
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
    "5th Year",
    "6th Year",
    "Postgraduate",
  ]),
  position: z.string().trim().min(2).max(100),
  scholarCode: z.string().trim().min(2).max(50),
  photoUrl: z.string().trim().url("Photo URL must be a valid URL"),
  status: z.enum(["PENDING", "APPROVED"]).default("APPROVED"),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined; // PENDING, APPROVED, REJECTED

    const where = status ? { status } : {};

    const candidates = await prisma.candidate.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      include: {
        reviewedBy: {
          select: { username: true },
        },
      },
    });

    return success(candidates);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    const body = await req.json();
    const result = createCandidateSchema.safeParse(body);
    if (!result.success) {
      return error(result.error.issues[0].message, 400);
    }

    const normalizedPhone = normalizePhone(result.data.phone);
    if (!normalizedPhone) {
      return error("Invalid Kenyan phone number format.", 400);
    }

    const [voter, positionRef] = await Promise.all([
      prisma.voter.findUnique({ where: { phone: normalizedPhone } }),
      prisma.position.findUnique({ where: { title: result.data.position } }),
    ]);

    if (!voter) {
      return error(
        "Candidate phone number must belong to a registered voter.",
        400,
      );
    }

    if (!positionRef) {
      return error("Selected position does not exist.", 400);
    }

    const {
      name,
      school,
      yearOfStudy,
      position,
      scholarCode,
      photoUrl,
      status,
    } = result.data;
    const adminId = auth.admin.id;

    const candidate = await prisma.candidate.create({
      data: {
        name,
        phone: normalizedPhone,
        school,
        yearOfStudy,
        position,
        scholarCode,
        photoUrl,
        status,
        reviewedById: status === "APPROVED" ? adminId : null,
        reviewedAt: status === "APPROVED" ? new Date() : null,
      },
    });

    await logAudit(
      req,
      adminId,
      "CREATE_CANDIDATE",
      "Candidate",
      candidate.id,
      {
        candidateName: candidate.name,
        phone: candidate.phone,
        position: candidate.position,
        status: candidate.status,
      },
    );

    return success(candidate, 201);
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return error(
        "A candidate with this phone or scholar code already exists.",
        409,
      );
    }

    return serverError(err);
  }
}
