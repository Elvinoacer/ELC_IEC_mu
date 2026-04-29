import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { verifyAdminPassword, hashAdminPassword } from "@/lib/auth/admin-password";
import { success, error, serverError } from "@/lib/response";
import { logAudit } from "@/lib/audit";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    const body = await req.json();
    const result = changePasswordSchema.safeParse(body);

    if (!result.success) {
      return error(result.error.issues[0].message, 400);
    }

    const { currentPassword, newPassword } = result.data;

    const admin = await prisma.admin.findUnique({
      where: { id: auth.admin.id },
    });

    if (!admin) {
      return error("Admin not found", 404);
    }

    const isMatch = await verifyAdminPassword(currentPassword, admin.passwordHash);
    if (!isMatch) {
      return error("Current password is incorrect", 401);
    }

    const hashedPassword = await hashAdminPassword(newPassword);

    await prisma.admin.update({
      where: { id: auth.admin.id },
      data: { passwordHash: hashedPassword },
    });

    await logAudit(req, auth.admin.id, "CHANGE_OWN_PASSWORD", "Admin", auth.admin.id.toString());

    return success({ message: "Password updated successfully" });
  } catch (err) {
    return serverError(err);
  }
}
