import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { clearAdminCookie, getAdminTokenFromRequest } from "@/lib/jwt";
import { success, unauthorized, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const payload = await getAdminTokenFromRequest(req);
    if (!payload) {
      return unauthorized("Admin authentication required");
    }

    const admin = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    if (!admin) {
      const res = unauthorized("Admin session is invalid");
      res.headers.set("Set-Cookie", clearAdminCookie());
      return res;
    }

    return success({ admin });
  } catch (err) {
    return serverError(err);
  }
}
