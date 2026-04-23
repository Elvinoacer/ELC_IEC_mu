import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { success, serverError } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          admin: {
            select: {
              username: true,
            }
          }
        }
      }),
      prisma.auditLog.count(),
    ]);

    return success(logs, 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return serverError(err);
  }
}
