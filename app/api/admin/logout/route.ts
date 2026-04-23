import { clearAdminCookie } from "@/lib/jwt";
import { success } from "@/lib/response";

export async function POST() {
  const res = success({ message: "Logged out" });
  res.headers.set("Set-Cookie", clearAdminCookie());
  return res;
}
