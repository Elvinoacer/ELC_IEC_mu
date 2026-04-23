import { NextRequest } from "next/server";
import { z } from "zod";
import { success, error, serverError } from "@/lib/response";
import { normalizePhone } from "@/lib/phone";
import { verifyOTP } from "@/lib/otp";
import { signCandidateRegToken } from "@/lib/jwt";
import { serialize } from "cookie";

const verifySchema = z.object({
  phone: z.string().min(1),
  code: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = verifySchema.safeParse(body);

    if (!result.success) {
      return error(result.error.issues[0].message, 400);
    }

    const { phone, code } = result.data;
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return error("Invalid Kenyan phone number format.", 400);
    }

    const verifyResult = await verifyOTP(normalizedPhone, code);

    if (verifyResult.status === "expired") {
      return error(
        "OTP has expired or is invalid. Please request a new one.",
        400,
      );
    }
    if (verifyResult.status === "wrong") {
      return error("Incorrect OTP.", 400);
    }
    if (verifyResult.status === "locked") {
      return error(
        "Too many incorrect attempts. Please request a new OTP.",
        429,
      );
    }

    // Success - Issue candidate registration token
    const token = await signCandidateRegToken(normalizedPhone);
    const cookieHeader = serialize("candidate_reg_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 3600, // 1 hour
    });

    const res = success({ message: "Phone verified successfully" });
    res.headers.set("Set-Cookie", cookieHeader);
    return res;
  } catch (err) {
    return serverError(err);
  }
}
