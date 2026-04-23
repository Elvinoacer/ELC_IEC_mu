import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { success, error, serverError } from "@/lib/response";
import { verifyCandidateRegToken } from "@/lib/jwt";
import {
  uploadFile,
  validateFile,
  validateMagicBytes,
  deleteFile,
  extractKeyFromUrl,
} from "@/lib/upload";
import { sendSMS, SMS_TEMPLATES } from "@/lib/sms";
import { normalizePhone } from "@/lib/phone";

const candidateRegistrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().min(1),
  school: z.string().trim().min(2).max(150),
  yearOfStudy: z.enum([
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
    "5th Year",
    "6th Year",
    "Postgraduate",
  ]),
  position: z.string().trim().min(2).max(100),
  scholarCode: z.string().trim().min(2).max(50),
});

class CandidateRegistrationError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify candidate session
    const token = req.cookies.get("candidate_reg_session")?.value;
    if (!token) {
      return error(
        "Session expired or unauthorized. Please verify your phone number again.",
        401,
      );
    }

    const payload = await verifyCandidateRegToken(token);
    if (!payload) {
      return error("Invalid or expired registration session.", 401);
    }

    const sessionPhone = payload.phone;

    // 2. Parse FormData
    const formData = await req.formData();

    const photo = formData.get("photo");
    if (!(photo instanceof File)) {
      return error(
        "All fields are required, including the candidate photo.",
        400,
      );
    }

    const result = candidateRegistrationSchema.safeParse({
      name: formData.get("name"),
      phone: formData.get("phone"),
      school: formData.get("school"),
      yearOfStudy: formData.get("yearOfStudy"),
      position: formData.get("position"),
      scholarCode: formData.get("scholarCode"),
    });

    if (!result.success) {
      return error(result.error.issues[0].message, 400);
    }

    const { name, phone, school, yearOfStudy, position, scholarCode } =
      result.data;

    const normalizedSubmittedPhone = normalizePhone(phone);

    // Phone from form MUST match the phone verified via OTP
    if (
      !normalizedSubmittedPhone ||
      normalizedSubmittedPhone !== sessionPhone
    ) {
      return error(
        "The submitted phone number does not match the verified phone number.",
        403,
      );
    }

    // 3. Check if registration is open
    const config = await prisma.votingConfig.findUnique({ where: { id: 1 } });
    if (config) {
      const now = new Date();
      if (config.candidateRegOpensAt && now < config.candidateRegOpensAt) {
        return error("Candidate registration has not opened yet.", 403);
      }
      if (config.candidateRegClosesAt && now > config.candidateRegClosesAt) {
        return error("Candidate registration has closed.", 403);
      }
    }

    // Verify position exists
    const positionRef = await prisma.position.findUnique({
      where: { title: position },
    });
    if (!positionRef) {
      return error(
        `The position "${position}" is not a valid elective position.`,
        400,
      );
    }

    // 4. Validate and upload photo
    const buffer = Buffer.from(await photo.arrayBuffer());
    const validation = validateFile(photo.name, photo.size, photo.type);
    if (!validation.valid) {
      return error(validation.error || "Invalid file.", 400);
    }

    if (!validateMagicBytes(buffer, photo.type)) {
      return error("Invalid photo content detected.", 400);
    }

    let photoUrl = "";
    try {
      photoUrl = await uploadFile(buffer, photo.name, photo.type);
    } catch (err) {
      console.error("Photo upload failed:", err);
      return error("Failed to upload photo. Please try again.", 500);
    }

    let replacedRejectedPhotoUrl: string | null = null;
    let candidateId: number | null = null;

    try {
      const savedCandidate = await prisma.$transaction(async (tx) => {
        const existingCandidate = await tx.candidate.findUnique({
          where: { phone: sessionPhone },
        });

        if (existingCandidate?.status === "PENDING") {
          throw new CandidateRegistrationError(
            409,
            "You already have a pending application.",
          );
        }

        if (existingCandidate?.status === "APPROVED") {
          throw new CandidateRegistrationError(
            409,
            "You are already an approved candidate.",
          );
        }

        const existingScholarCode = await tx.candidate.findUnique({
          where: { scholarCode },
        });

        if (
          existingScholarCode &&
          existingScholarCode.id !== existingCandidate?.id
        ) {
          throw new CandidateRegistrationError(
            409,
            "This scholar code is already in use by another candidate.",
          );
        }

        if (existingCandidate?.status === "REJECTED") {
          replacedRejectedPhotoUrl = existingCandidate.photoUrl;
          return tx.candidate.update({
            where: { id: existingCandidate.id },
            data: {
              name,
              school,
              yearOfStudy,
              position,
              scholarCode,
              photoUrl,
              status: "PENDING",
              rejectionNote: null,
              reviewedAt: null,
              reviewedById: null,
              submittedAt: new Date(),
              votes: 0,
            },
          });
        }

        return tx.candidate.create({
          data: {
            name,
            phone: sessionPhone,
            school,
            yearOfStudy,
            position,
            scholarCode,
            photoUrl,
            status: "PENDING",
          },
        });
      });

      candidateId = savedCandidate.id;
    } catch (err: any) {
      const uploadedKey = photoUrl ? extractKeyFromUrl(photoUrl) : null;
      if (uploadedKey) {
        try {
          await deleteFile(uploadedKey);
        } catch (cleanupErr) {
          console.error(
            "Failed to cleanup uploaded file after registration failure:",
            cleanupErr,
          );
        }
      }

      if (err instanceof CandidateRegistrationError) {
        return error(err.message, err.statusCode);
      }

      if (err?.code === "P2002") {
        return error(
          "An application with this phone number or scholar code already exists.",
          409,
        );
      }

      throw err;
    }

    if (replacedRejectedPhotoUrl && replacedRejectedPhotoUrl !== photoUrl) {
      const oldKey = extractKeyFromUrl(replacedRejectedPhotoUrl);
      if (oldKey) {
        try {
          await deleteFile(oldKey);
        } catch (cleanupErr) {
          console.error(
            "Failed to cleanup old rejected candidate photo:",
            cleanupErr,
          );
        }
      }
    }

    let smsWarning: string | null = null;
    try {
      await sendSMS(sessionPhone, SMS_TEMPLATES.candidateReceived(position));
    } catch (smsErr) {
      console.error(
        "[candidate-register] Application saved but SMS failed:",
        smsErr,
      );
      smsWarning =
        "Application saved, but SMS confirmation could not be delivered.";
    }

    return success(
      {
        message:
          "Application submitted successfully. You will be notified once reviewed.",
        candidateId,
        smsWarning,
      },
      201,
    );
  } catch (err) {
    return serverError(err);
  }
}
