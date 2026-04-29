import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { success, error, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    // Only SUPER_ADMIN can list all admins
    if (auth.admin.role !== "SUPER_ADMIN") {
      return error("Unauthorized. Only Super Admins can view the admin list.", 403);
    }

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return success({ admins });
  } catch (err) {
    return serverError(err);
  }
}
