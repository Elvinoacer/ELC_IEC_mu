import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { success, serverError } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";

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
