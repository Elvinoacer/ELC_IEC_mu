import { success, serverError } from "@/lib/response";
import { generateResultsPayload } from "@/lib/results";

export const revalidate = 0; // Prevent caching of this route

export async function GET() {
  try {
    const payload = await generateResultsPayload();
    return success(payload);
  } catch (err) {
    return serverError(err);
  }
}
