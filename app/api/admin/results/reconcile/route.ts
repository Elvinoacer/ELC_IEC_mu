import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

/**
 * Reconciliation API: Recalculates all candidate vote counts from the Vote table.
 * Restricted to SUPER_ADMIN.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    // Reconciliation is no longer needed as we use dynamic counting via _count
    // But we keep the endpoint to avoid breaking legacy admin UI components
    return success({
      message: "Reconciliation is no longer required. Vote counts are now calculated dynamically from the primary vote records.",
      correctionsFound: 0,
      details: []
    });

  } catch (err) {
    return serverError(err);
  }
}
