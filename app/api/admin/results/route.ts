import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { success, serverError } from "@/lib/response";
import { generateResultsPayload } from "@/lib/results";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if ("response" in auth) return auth.response;

    const payload = await generateResultsPayload({
      includeCandidateResults: true,
    });
    return success(payload);
  } catch (err) {
    return serverError(err);
  }
}
