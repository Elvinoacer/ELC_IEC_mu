import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { normalizePhone, isValidKenyanPhone } from "@/lib/phone";
import { sendOTP, checkOTPRateLimit } from "@/lib/otp";

const phoneSchema = z.object({
  phone: z.string().min(1, "Phone is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = phoneSchema.safeParse(body);

    if (!result.success) {
      return error(result.error.issues[0].message, 400);
    }

    const { phone } = result.data;

    if (!isValidKenyanPhone(phone)) {
      return error("Invalid Kenyan phone number format.", 400);
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return error("Invalid Kenyan phone number format.", 400);
    }

    // 1. Check if number exists in voters registry
    const voter = await prisma.voter.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!voter) {
      return error(
        "This phone number is not registered in the ELP voter registry.",
        404,
      );
    }

    // 2. Check if candidate already applied and is pending/approved
    const existingCandidate = await prisma.candidate.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existingCandidate) {
      if (existingCandidate.status === "PENDING") {
        return error(
          "You already have a pending application for candidacy.",
          409,
        );
      }
      if (existingCandidate.status === "APPROVED") {
        return error("You are already an approved candidate.", 409);
      }
      // If REJECTED, they can re-apply.
    }

    // 3. Rate limiting for OTP sends (max 5 per hour)
    const canSend = await checkOTPRateLimit(normalizedPhone);

    if (!canSend) {
      return error("Too many OTP requests. Please try again later.", 429);
    }

    // 4. Send OTP
    await sendOTP(normalizedPhone);

    return success({ message: "OTP sent successfully" });
  } catch (err) {
    return serverError(err);
  }
}
