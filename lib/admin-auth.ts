import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { clearAdminCookie, getAdminTokenFromRequest } from "@/lib/jwt";
import { unauthorized } from "@/lib/response";

export interface AuthenticatedAdmin {
  id: number;
  username: string;
  role: string;
}

export async function requireAdminSession(
  req: NextRequest,
): Promise<{ admin: AuthenticatedAdmin } | { response: NextResponse }> {
  const payload = await getAdminTokenFromRequest(req);

  if (!payload) {
    return { response: unauthorized("Admin authentication required") };
  }

  const admin = await prisma.admin.findUnique({
    where: { id: payload.adminId },
    select: {
      id: true,
      username: true,
      role: true,
    },
  });

  if (!admin) {
    const response = unauthorized("Admin session is invalid");
    response.headers.set("Set-Cookie", clearAdminCookie());
    return { response };
  }

  return { admin };
}
