import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { hashAdminPassword } from "@/lib/auth/admin-password";
import { success, error, serverError } from "@/lib/response";
import { logAudit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    // Only SUPER_ADMIN can reset other passwords
    if (auth.admin.role !== "SUPER_ADMIN") {
      return error("Unauthorized. Only Super Admins can reset passwords.", 403);
    }

    const { id } = await params;
    const targetAdminId = parseInt(id, 10);

    if (isNaN(targetAdminId)) {
      return error("Invalid admin ID", 400);
    }

    // Prevent resetting own password via this endpoint (use change-password instead)
    if (targetAdminId === auth.admin.id) {
      return error("Please use the Security settings to change your own password.", 400);
    }

    const targetAdmin = await prisma.admin.findUnique({
      where: { id: targetAdminId },
    });

    if (!targetAdmin) {
      return error("Target admin not found", 404);
    }

    // Reset to generic default
    const DEFAULT_PASSWORD = "Admin@2026";
    const hashedPassword = await hashAdminPassword(DEFAULT_PASSWORD);

    await prisma.admin.update({
      where: { id: targetAdminId },
      data: { passwordHash: hashedPassword },
    });

    await logAudit(req, auth.admin.id, "RESET_ADMIN_PASSWORD", "Admin", targetAdminId.toString(), {
      targetUsername: targetAdmin.username,
    });

    return success({ 
      message: `Password for ${targetAdmin.username} has been reset to the default.`,
      defaultPassword: DEFAULT_PASSWORD 
    });
  } catch (err) {
    return serverError(err);
  }
}
