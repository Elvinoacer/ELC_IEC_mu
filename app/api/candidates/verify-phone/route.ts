import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { normalizePhone } from "@/lib/phone";
import { sendOTP, checkOTPRateLimit, findRecentReusableOTP } from "@/lib/otp";
import { maskEmail } from "@/lib/email";

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

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return error("Invalid Kenyan phone number format.", 400);
    }

    // Check Candidate Registration Window
    const config = await prisma.votingConfig.findUnique({ where: { id: 1 } });
    if (config) {
      const now = new Date();
      if (config.isManuallyClosed) {
        return error("Candidate registration is currently suspended by the IEC.", 403);
      }
      if (config.candidateRegOpensAt && now < config.candidateRegOpensAt) {
        return error("Candidate registration has not opened yet.", 403);
      }
      if (config.candidateRegClosesAt && now > config.candidateRegClosesAt) {
        return error("Candidate registration has officially closed.", 403);
      }
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

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    // 3. Rate limiting for OTP sends (max 5 per hour)
    const canSend = await checkOTPRateLimit(normalizedPhone, ipAddress);

    if (!canSend) {
      return error("Too many OTP requests. Please try again later.", 429);
    }

    const recentOtp = await findRecentReusableOTP(normalizedPhone);
    if (recentOtp) {
      return success({
        message: "A verification code has already been sent to this number.",
        alreadySent: true,
        expiresAt: recentOtp.expiresAt.toISOString(),
        maskedEmail: voter.email ? maskEmail(voter.email) : null,
      });
    }

    // 4. Send OTP — need voter's verified email for delivery
    if (!voter.email || !voter.emailVerified) {
      return error(
        "No verified email on file. Please register your email at the registration desk before applying.",
        403,
      );
    }

    const { expiresAt, emailFailed } = await sendOTP(normalizedPhone, voter.email, ipAddress);

    return success({
      message: emailFailed ? "OTP created but email delivery may have failed. Request a new code if you don't receive it." : "OTP sent successfully",
      alreadySent: false,
      expiresAt: expiresAt.toISOString(),
      maskedEmail: maskEmail(voter.email),
    });
  } catch (err) {
    return serverError(err);
  }
}
