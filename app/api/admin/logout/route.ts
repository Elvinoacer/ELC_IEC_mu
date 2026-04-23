import { NextRequest } from "next/server";
import { clearAdminCookie } from "@/lib/jwt";
import { success } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    
    if (!('response' in auth)) {
      await logAudit(
        req,
        auth.admin.id,
        "LOGOUT",
        "Admin",
        auth.admin.id
      );
    }

    const res = success({ message: "Logged out" });
    res.headers.set("Set-Cookie", clearAdminCookie());
    return res;
  } catch (err) {
    // If auth fails, still clear the cookie
    const res = success({ message: "Logged out" });
    res.headers.set("Set-Cookie", clearAdminCookie());
    return res;
  }
}
